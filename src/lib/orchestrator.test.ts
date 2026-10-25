import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { verifyChain } from './audit/chain';
import { openDatabase } from './db';
import { PayPalError, requestIdFor } from './paypal/client';
import { applyTrigger, type OrchestratorDeps } from './orchestrator';
import { TransactionRepository, type StoredTx } from './repository';

const databases: DatabaseSync[] = [];
afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});

function fixture(status: StoredTx['status'] = 'DRAFT', extra: Partial<StoredTx> = {}) {
  const db = openDatabase(':memory:');
  databases.push(db);
  db.prepare('INSERT INTO users (id, role, display_name) VALUES (?, ?, ?)').run('buyer', 'buyer', 'Buyer');
  db.prepare('INSERT INTO users (id, role, display_name) VALUES (?, ?, ?)').run('seller', 'seller', 'Seller');
  const repo = new TransactionRepository(db);
  repo.insertTransaction({
    id: 'tx-1', status, captured: false, buyerId: 'buyer', sellerId: 'seller',
    item: 'Synthetic item', amount: '10.00', currency: 'USD', termsJson: '{}',
    shipBy: '2026-10-21T00:00:00Z', inspectionUntil: '2026-10-23T00:00:00Z',
    ...extra,
  });
  const paypal = {
    createAuthorizeOrder: vi.fn().mockResolvedValue({ orderId: 'order-1', status: 'PAYER_ACTION_REQUIRED', approvalUrl: 'https://example.test/approve' }),
    authorizeOrder: vi.fn().mockResolvedValue({ orderStatus: 'COMPLETED', authorizationId: 'auth-1', authorizationStatus: 'CREATED' }),
    captureAuthorization: vi.fn().mockResolvedValue({ captureId: 'capture-1', status: 'COMPLETED' }),
    voidAuthorization: vi.fn().mockResolvedValue(undefined),
    refundCapture: vi.fn().mockResolvedValue({ refundId: 'refund-1', status: 'COMPLETED' }),
  };
  const deps: OrchestratorDeps = {
    repo, paypal, actor: 'test', now: () => '2026-10-20T00:00:00Z',
    returnUrl: 'https://example.test/return', cancelUrl: 'https://example.test/cancel',
  };
  return { db, repo, paypal, deps };
}

describe('applyTrigger with SQLite', () => {
  it('commits the happy path, PayPal ids, and an audit chain readable from SQLite', async () => {
    const { db, repo, paypal, deps } = fixture();
    expect((await applyTrigger('tx-1', { type: 'ACCEPT_TERMS', bothAccepted: true }, deps)).ok).toBe(true);
    const payment = await applyTrigger('tx-1', { type: 'START_PAYMENT' }, deps);
    expect(payment.ok && payment.approvalUrl).toBe('https://example.test/approve');
    expect((await applyTrigger('tx-1', { type: 'BUYER_APPROVED', orderApproved: true }, deps)).ok).toBe(true);
    expect((await applyTrigger('tx-1', { type: 'SUBMIT_TRACKING', now: '2026-10-20T12:00:00Z' }, deps)).ok).toBe(true);
    expect((await applyTrigger('tx-1', { type: 'TRACKING_DELIVERED', destinationMatches: true }, deps)).ok).toBe(true);
    const completion = await applyTrigger('tx-1', { type: 'BUYER_CONFIRM', externalDisputeOpen: false }, deps);
    expect(completion.ok).toBe(true);
    expect(repo.loadTransaction('tx-1')).toMatchObject({
      status: 'COMPLETED', captured: true, paypalOrderId: 'order-1',
      paypalAuthId: 'auth-1', paypalCaptureId: 'capture-1',
    });
    expect(paypal.createAuthorizeOrder).toHaveBeenCalledWith(expect.objectContaining({ requestId: requestIdFor('tx-1', 'PAYPAL_CREATE_ORDER') }));
    expect(paypal.authorizeOrder).toHaveBeenCalledWith('order-1', requestIdFor('tx-1', 'PAYPAL_AUTHORIZE'));
    expect(paypal.captureAuthorization).toHaveBeenCalledWith('auth-1', requestIdFor('tx-1', 'PAYPAL_CAPTURE'));
    const events = repo.readEvents('tx-1');
    expect(events.map((event) => event.seq)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(verifyChain(events)).toMatchObject({ ok: true, length: 6 });
    expect(() => db.prepare("UPDATE events SET actor = 'other' WHERE tx_id = 'tx-1'").run()).toThrow('append-only');
    expect(() => db.prepare("DELETE FROM events WHERE tx_id = 'tx-1'").run()).toThrow('append-only');
  });

  it('records ORDER_NOT_APPROVED without changing status or repeating the PayPal call', async () => {
    const { repo, paypal, deps } = fixture('AWAITING_APPROVAL', { paypalOrderId: 'order-1' });
    paypal.authorizeOrder.mockRejectedValue(new PayPalError(422, 'UNPROCESSABLE_ENTITY', 'ORDER_NOT_APPROVED', 'debug-1', 'Buyer approval is missing'));
    const first = await applyTrigger('tx-1', { type: 'BUYER_APPROVED', orderApproved: true }, deps);
    const retry = await applyTrigger('tx-1', { type: 'BUYER_APPROVED', orderApproved: true }, deps);
    expect(first.ok).toBe(false);
    expect(retry.ok).toBe(false);
    if (!retry.ok) expect(retry.error).toMatchObject({ issue: 'ORDER_NOT_APPROVED', debugId: 'debug-1' });
    expect(paypal.authorizeOrder).toHaveBeenCalledTimes(1);
    expect(repo.loadTransaction('tx-1')?.status).toBe('AWAITING_APPROVAL');
    expect(repo.readEvents('tx-1')[0]?.payload).toMatchObject({ issue: 'ORDER_NOT_APPROVED', debug_id: 'debug-1' });
    expect(verifyChain(repo.readEvents('tx-1')).ok).toBe(true);
  });

  it('records PREVIOUSLY_CAPTURED and leaves the review state unchanged', async () => {
    const { repo, paypal, deps } = fixture('UNDER_REVIEW', { paypalAuthId: 'auth-1' });
    paypal.voidAuthorization.mockRejectedValue(new PayPalError(422, 'UNPROCESSABLE_ENTITY', 'PREVIOUSLY_CAPTURED', 'debug-2', 'Already captured'));
    const result = await applyTrigger('tx-1', { type: 'DECISION', outcome: 'REFUND' }, deps);
    expect(result.ok).toBe(false);
    expect(paypal.voidAuthorization).toHaveBeenCalledWith('auth-1', requestIdFor('tx-1', 'PAYPAL_VOID'));
    expect(repo.loadTransaction('tx-1')?.status).toBe('UNDER_REVIEW');
    expect(repo.readEvents('tx-1')[0]?.payload).toMatchObject({ issue: 'PREVIOUSLY_CAPTURED', debug_id: 'debug-2' });
  });

  it('does not update status after a capture failure', async () => {
    const { repo, paypal, deps } = fixture('IN_INSPECTION', { paypalAuthId: 'auth-1' });
    paypal.captureAuthorization.mockRejectedValue(new PayPalError(503, 'SERVICE_UNAVAILABLE', undefined, 'debug-3', 'Try later'));
    const result = await applyTrigger('tx-1', { type: 'BUYER_CONFIRM', externalDisputeOpen: false }, deps);
    expect(result.ok).toBe(false);
    expect(repo.loadTransaction('tx-1')).toMatchObject({ status: 'IN_INSPECTION', captured: false });
    expect(repo.readEvents('tx-1')).toHaveLength(1);
  });

  it('returns the cached success on a retry without a second PayPal call', async () => {
    const { repo, paypal, deps } = fixture('IN_INSPECTION', { paypalAuthId: 'auth-1' });
    const trigger = { type: 'BUYER_CONFIRM', externalDisputeOpen: false } as const;
    const first = await applyTrigger('tx-1', trigger, deps);
    const retry = await applyTrigger('tx-1', trigger, deps);
    expect(first).toEqual(retry);
    expect(paypal.captureAuthorization).toHaveBeenCalledTimes(1);
    expect(repo.readEvents('tx-1')).toHaveLength(1);
  });

  it('keeps one PayPal call when concurrent attempts use the same request id', async () => {
    const { paypal, deps } = fixture('IN_INSPECTION', { paypalAuthId: 'auth-1' });
    let release!: (value: { captureId: string; status: string }) => void;
    paypal.captureAuthorization.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    const first = applyTrigger('tx-1', { type: 'BUYER_CONFIRM', externalDisputeOpen: false }, deps);
    const second = await applyTrigger('tx-1', { type: 'BUYER_CONFIRM', externalDisputeOpen: false }, deps);
    expect(second).toMatchObject({ ok: false, error: { code: 'ACTION_PENDING' } });
    release({ captureId: 'capture-1', status: 'COMPLETED' });
    expect((await first).ok).toBe(true);
    expect(paypal.captureAuthorization).toHaveBeenCalledTimes(1);
  });

  it('rolls back the status when writing the audit event fails', async () => {
    const { db, repo, deps } = fixture();
    db.exec(`CREATE TRIGGER reject_test_event BEFORE INSERT ON events
      BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END`);
    await expect(applyTrigger('tx-1', { type: 'ACCEPT_TERMS', bothAccepted: true }, deps))
      .rejects.toThrow('audit unavailable');
    expect(repo.loadTransaction('tx-1')?.status).toBe('DRAFT');
    expect(repo.readEvents('tx-1')).toHaveLength(0);
  });
});


describe('unconfirmed provider outcomes', () => {
  it.each(['PENDING', 'DENIED', 'DECLINED', undefined])('keeps capture %s pending without claiming completion or resending', async (status) => {
    const { repo, paypal, deps } = fixture('IN_INSPECTION', { paypalAuthId: 'auth-1' });
    paypal.captureAuthorization.mockResolvedValue({ captureId: 'capture-1', status: status as string });
    const trigger = { type: 'BUYER_CONFIRM', externalDisputeOpen: false } as const;
    expect(await applyTrigger('tx-1', trigger, deps)).toMatchObject({ ok: false, error: { code: 'CAPTURE_UNCONFIRMED' } });
    expect(repo.loadTransaction('tx-1')).toMatchObject({ status: 'IN_INSPECTION', captured: false });
    expect(repo.readEvents('tx-1')).toHaveLength(0);
    expect(await applyTrigger('tx-1', trigger, deps)).toMatchObject({ ok: false, error: { code: 'ACTION_PENDING' } });
    expect(paypal.captureAuthorization).toHaveBeenCalledTimes(1);
  });

  it.each(['PENDING', 'FAILED', undefined])('does not mark a full refund %s as completed', async (status) => {
    const { repo, paypal, deps } = fixture('UNDER_REVIEW', { captured: true, paypalCaptureId: 'capture-1' });
    paypal.refundCapture.mockResolvedValue({ refundId: 'refund-1', status: status as string });
    const trigger = { type: 'DECISION', outcome: 'REFUND' } as const;
    expect(await applyTrigger('tx-1', trigger, deps)).toMatchObject({ ok: false, error: { code: 'REFUND_UNCONFIRMED' } });
    expect(repo.loadTransaction('tx-1')?.status).toBe('UNDER_REVIEW');
    expect(await applyTrigger('tx-1', trigger, deps)).toMatchObject({ ok: false, error: { code: 'ACTION_PENDING' } });
    expect(paypal.refundCapture).toHaveBeenCalledTimes(1);
  });

  it('does not record a denied authorization as authorized', async () => {
    const { repo, paypal, deps } = fixture('AWAITING_APPROVAL', { paypalOrderId: 'order-1' });
    paypal.authorizeOrder.mockResolvedValue({ orderStatus: 'COMPLETED', authorizationId: 'auth-1', authorizationStatus: 'DENIED' });
    const trigger = { type: 'BUYER_APPROVED', orderApproved: true } as const;
    expect(await applyTrigger('tx-1', trigger, deps)).toMatchObject({ ok: false, error: { code: 'AUTHORIZATION_UNCONFIRMED' } });
    expect(repo.loadTransaction('tx-1')?.status).toBe('AWAITING_APPROVAL');
    expect(await applyTrigger('tx-1', trigger, deps)).toMatchObject({ ok: false, error: { code: 'ACTION_PENDING' } });
    expect(paypal.authorizeOrder).toHaveBeenCalledTimes(1);
  });

  it.each(['capture', 'refund', 'authorize'] as const)('rejects a missing %s provider ID', async (kind) => {
    const { repo, paypal, deps } = fixture(kind === 'authorize' ? 'AWAITING_APPROVAL' : kind === 'refund' ? 'UNDER_REVIEW' : 'IN_INSPECTION', {
      paypalOrderId: 'order-1', paypalAuthId: 'auth-1', ...(kind === 'refund' ? { captured: true, paypalCaptureId: 'capture-1' } : {}),
    });
    paypal.captureAuthorization.mockResolvedValue({ captureId: 'undefined', status: 'COMPLETED' });
    paypal.refundCapture.mockResolvedValue({ refundId: '', status: 'COMPLETED' });
    paypal.authorizeOrder.mockResolvedValue({ orderStatus: 'COMPLETED', authorizationId: '', authorizationStatus: 'CREATED' });
    const trigger = kind === 'authorize' ? { type: 'BUYER_APPROVED', orderApproved: true } as const
      : kind === 'refund' ? { type: 'DECISION', outcome: 'REFUND' } as const
      : { type: 'BUYER_CONFIRM', externalDisputeOpen: false } as const;
    expect((await applyTrigger('tx-1', trigger, deps)).ok).toBe(false);
    expect(repo.readEvents('tx-1')).toHaveLength(0);
  });
});


it('blocks a competing void while capture is in flight', async () => {
  const { repo, paypal, deps } = fixture('UNDER_REVIEW', { paypalAuthId: 'auth-1' });
  let release!: (value: { captureId: string; status: string }) => void;
  paypal.captureAuthorization.mockImplementation(() => new Promise(resolve => { release = resolve; }));
  const first = applyTrigger('tx-1', { type: 'DECISION', outcome: 'RELEASE' }, deps);
  expect(await applyTrigger('tx-1', { type: 'DECISION', outcome: 'REFUND' }, deps))
    .toMatchObject({ ok: false, error: { code: 'ACTION_PENDING' } });
  expect(paypal.voidAuthorization).not.toHaveBeenCalled();
  release({ captureId: 'capture-1', status: 'COMPLETED' });
  expect((await first).ok).toBe(true);
  expect(repo.loadTransaction('tx-1')?.status).toBe('COMPLETED');
});
