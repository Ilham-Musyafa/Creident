import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase, migrate } from './db';
import { TransactionRepository, type StoredTx } from './repository';
import { applyTrigger, type OrchestratorDeps } from './orchestrator';
import { PayPalError, requestIdFor } from './paypal/client';
import { transition } from './domain/stateMachine';
import { isFinal } from './domain/types';
import { verifyChain } from './audit/chain';
import { validPartialAmount } from './partialAmount';

const dbs: DatabaseSync[] = [];
afterEach(() => { dbs.splice(0).forEach(db => db.close()); });
function setup(extra: Partial<StoredTx> = {}) {
  const db = openDatabase(':memory:'); dbs.push(db);
  for (const side of ['buyer', 'seller', 'reviewer']) db.prepare('INSERT INTO users VALUES (?, ?, ?)').run(side, side, side);
  const repo = new TransactionRepository(db);
  const tx: StoredTx = { id: 'partial-tx', buyerId: 'buyer', sellerId: 'seller', item: '[Demo] Synthetic adapter', status: 'UNDER_REVIEW', captured: false, amount: '10.00', currency: 'USD', termsJson: '{"condition":"Synthetic","demo":true}', paypalAuthId: 'DEMO-AUTH', ...extra };
  repo.createTransaction(tx, { txId: tx.id, ts: '2026-10-22T00:00:00Z', actor: 'seller', type: 'TRANSACTION_CREATED', payload: { simulated: true } });
  const calls: string[] = [];
  const paypal = { createAuthorizeOrder: vi.fn(), authorizeOrder: vi.fn(), voidAuthorization: vi.fn(),
    captureAuthorization: vi.fn(async () => { calls.push('capture'); return { captureId: 'DEMO-CAP', status: 'COMPLETED' }; }),
    refundCapture: vi.fn(async () => { calls.push('refund'); expect(repo.loadTransaction(tx.id)?.status).toBe('COMPLETED'); return { refundId: 'DEMO-REF', status: 'COMPLETED' }; }) };
  const deps: OrchestratorDeps = { repo, paypal, actor: 'reviewer', now: () => '2026-10-22T00:00:00Z',
    extras: { decision: { outcome: 'PARTIAL_REFUND', reviewerId: 'reviewer', reason: 'The reviewer values the missing synthetic adapter at 2 USD.' } },
    eventPayload: { simulated: true, aiDraft: { feature: 'copilot', accepted: 'edited' } } };
  const decide = (requireReturn = false, amount = '2.00') => applyTrigger(tx.id, { type: 'DECISION', outcome: 'PARTIAL_REFUND', amount, requireReturn }, deps);
  return { db, tx, repo, paypal, calls, deps, decide };
}
describe('reviewer partial refund', () => {
  it.each(['0.00', '10.00', '10.01', '-1.00', '1', '1.0', '1.001', '1,00', '01.00', '1e0', 'NaN', '$1.00', '', ' 2.00'])('rejects invalid partial amount %s', async amount => {
    const { decide, paypal, repo } = setup(); expect(validPartialAmount(amount, '10.00')).toBe(false);
    expect(await decide(false, amount)).toMatchObject({ ok: false, error: { code: 'INVALID_AMOUNT' } });
    expect(paypal.captureAuthorization).not.toHaveBeenCalled(); expect(repo.loadDecisions('partial-tx')).toEqual([]);
  });
  it('transitions through a durable capture then partial refund with separate request ids and verified audit', async () => {
    const { decide, repo, paypal, calls, tx } = setup();
    expect(await decide()).toMatchObject({ ok: true, tx: { status: 'PARTIALLY_REFUNDED', captured: true, partialRefundAmount: '2.00', partialRefundState: 'completed' } });
    expect(calls).toEqual(['capture', 'refund']);
    expect(paypal.captureAuthorization).toHaveBeenCalledWith('DEMO-AUTH', requestIdFor(tx.id, 'PAYPAL_CAPTURE'));
    expect(paypal.refundCapture).toHaveBeenCalledWith('DEMO-CAP', requestIdFor(tx.id, 'PAYPAL_PARTIAL_REFUND'), { currency: 'USD', value: '2.00' });
    for (const event of repo.readEvents(tx.id).filter(e => ['DECISION', 'PARTIAL_REFUND_CAPTURED', 'PARTIAL_REFUND_COMPLETED'].includes(e.type))) {
      expect(event.payload).toMatchObject({ amount: '2.00', reason: expect.any(String), termsHash: expect.stringMatching(/^[a-f0-9]{64}$/), evidenceDigest: expect.stringMatching(/^[a-f0-9]{64}$/), aiDraft: { feature: 'copilot', accepted: 'edited' } });
    }
    expect(repo.loadDecisions(tx.id)).toHaveLength(1); expect(repo.loadDecisions(tx.id)[0]).toMatchObject({ amount: '2.00', outcome: 'PARTIAL_REFUND', requireReturn: false });
    expect(verifyChain(repo.readEvents(tx.id)).ok).toBe(true); expect(isFinal('PARTIALLY_REFUNDED')).toBe(true); expect(validPartialAmount('2.00', '000010.00')).toBe(true);
    expect(await decide()).toMatchObject({ ok: true, tx: { status: 'PARTIALLY_REFUNDED' } }); expect(calls).toHaveLength(2);
    expect(await decide(false, '3.00')).toMatchObject({ ok: false, error: { code: 'PARTIAL_DECISION_CONFLICT' } });
  });
  it('keeps COMPLETED after refund failure and never re-sends either stage', async () => {
    const { decide, repo, paypal, tx } = setup(); paypal.refundCapture.mockRejectedValue(new PayPalError(422, 'UNPROCESSABLE_ENTITY', 'REFUND_FAILED', 'demo-debug', 'provider detail'));
    expect(await decide()).toMatchObject({ ok: false, error: { issue: 'REFUND_FAILED' } });
    expect(repo.loadTransaction(tx.id)).toMatchObject({ status: 'COMPLETED', captured: true, paypalCaptureId: 'DEMO-CAP', partialRefundState: 'pending' });
    expect(repo.readEvents(tx.id).at(-1)).toMatchObject({ type: 'PAYPAL_ERROR', payload: { amount: '2.00', debug_id: 'demo-debug', refundPending: true } });
    await decide(); expect(paypal.captureAuthorization).toHaveBeenCalledTimes(1); expect(paypal.refundCapture).toHaveBeenCalledTimes(1);
    expect(verifyChain(repo.readEvents(tx.id)).ok).toBe(true);
  });
  it.each(['capture', 'refund'] as const)('keeps an ambiguous %s result pending without leaking errors or blind retry', async stage => {
    const { decide, repo, paypal, tx } = setup();
    const method = stage === 'capture' ? paypal.captureAuthorization : paypal.refundCapture;
    method.mockRejectedValue(new Error('PRIVATE_TRANSPORT_DETAILS'));
    expect(await decide()).toMatchObject({ ok: false, error: { code: 'ACTION_PENDING' } });
    await decide(); expect(method).toHaveBeenCalledTimes(1);
    expect(repo.loadTransaction(tx.id)?.status).toBe(stage === 'capture' ? 'UNDER_REVIEW' : 'COMPLETED');
    expect(JSON.stringify(repo.readEvents(tx.id))).not.toContain('PRIVATE_TRANSPORT_DETAILS');
  });
  it('does not mark a pending PayPal refund as completed', async () => {
    const { decide, repo, paypal, tx } = setup(); paypal.refundCapture.mockResolvedValue({ refundId: 'DEMO-PENDING', status: 'PENDING' });
    expect(await decide()).toMatchObject({ ok: false, error: { code: 'ACTION_PENDING' } });
    expect(repo.loadTransaction(tx.id)?.status).toBe('COMPLETED'); await decide(); expect(paypal.refundCapture).toHaveBeenCalledTimes(1);
  });
  it('reserves before a concurrent capture and blocks replacing the recorded decision', async () => {
    const { decide, paypal } = setup(); let release!: () => void;
    const started = new Promise<void>(resolve => paypal.captureAuthorization.mockImplementation(async () => { resolve(); await new Promise<void>(r => { release = r; }); return { captureId: 'DEMO-CAP', status: 'COMPLETED' }; }));
    const first = decide(); await started; expect(await decide()).toMatchObject({ ok: false, error: { code: 'ACTION_PENDING' } });
    expect(await decide(false, '3.00')).toMatchObject({ ok: false, error: { code: 'PARTIAL_DECISION_CONFLICT' } });
    release(); expect((await first).ok).toBe(true); expect(paypal.captureAuthorization).toHaveBeenCalledTimes(1);
  });
  it('requires return delivery first, preserves its deadline and supports idempotent return retry', async () => {
    const { decide, deps, repo, calls, tx } = setup(); deps.extras!.returnBy = '2026-10-25T00:00:00Z';
    expect(await decide(true)).toMatchObject({ ok: true, tx: { status: 'RETURN_REQUESTED', partialRefundState: 'awaiting_return' } }); expect(calls).toEqual([]);
    await decide(true); expect(repo.loadDecisions(tx.id)).toHaveLength(1);
    const delivered = { type: 'RETURN_DELIVERED' as const, now: '2026-10-23T00:00:00Z', destinationMatches: true };
    expect(await applyTrigger(tx.id, { ...delivered, destinationMatches: false }, deps)).toMatchObject({ ok: false, error: { code: 'RETURN_WRONG_DESTINATION' } });
    expect((await applyTrigger(tx.id, delivered, deps)).ok).toBe(true);
    expect(repo.loadTransaction(tx.id)?.status).toBe('PARTIALLY_REFUNDED');
    expect((await applyTrigger(tx.id, delivered, deps)).ok).toBe(true); expect(calls).toEqual(['capture', 'refund']);
    expect(repo.readEvents(tx.id).filter(e => e.type === 'RETURN_DELIVERED')).toHaveLength(1);
  });
  it('cancels a conditional partial refund when the return deadline passes', async () => {
    const { decide, deps, repo, paypal, tx } = setup(); deps.extras!.returnBy = '2026-10-23T00:00:00Z'; await decide(true);
    expect(await applyTrigger(tx.id, { type: 'RETURN_DEADLINE_PASSED', now: '2026-10-24T00:00:00Z' }, deps)).toMatchObject({ ok: true, tx: { status: 'COMPLETED', partialRefundState: 'cancelled' } });
    expect(paypal.refundCapture).not.toHaveBeenCalled(); expect(await decide(true)).toMatchObject({ ok: false, error: { code: 'RETURN_EXPIRED' } });
    expect(repo.loadTransaction(tx.id)?.partialRefundState).toBe('cancelled');
  });
  it('reuses an existing capture and never captures it a second time', async () => {
    const { decide, paypal, calls } = setup({ captured: true, paypalCaptureId: 'DEMO-EXISTING' });
    expect((await decide()).ok).toBe(true); expect(calls).toEqual(['refund']); expect(paypal.captureAuthorization).not.toHaveBeenCalled();
  });
  it('honors an external freeze between capture and refund', async () => {
    const { decide, repo, paypal, tx } = setup(); paypal.captureAuthorization.mockImplementation(async () => {
      await applyTrigger(tx.id, { type: 'EXTERNAL_DISPUTE' }, { repo });
      return { captureId: 'DEMO-CAP', status: 'COMPLETED' };
    });
    expect((await decide()).ok).toBe(false); expect(repo.loadTransaction(tx.id)?.status).toBe('FROZEN_EXTERNAL'); expect(paypal.refundCapture).not.toHaveBeenCalled();
  });
  it('models direct and conditional partial decisions in the pure transition function', () => {
    const { tx } = setup();
    expect(transition(tx, { type: 'DECISION', outcome: 'PARTIAL_REFUND', amount: '2.00' })).toMatchObject({ ok: true, tx: { status: 'PARTIALLY_REFUNDED' }, effect: { kind: 'PAYPAL_PARTIAL_REFUND' } });
    expect(transition(tx, { type: 'DECISION', outcome: 'PARTIAL_REFUND', amount: '2.00', requireReturn: true })).toMatchObject({ ok: true, tx: { status: 'RETURN_REQUESTED' }, effect: { kind: 'NONE' } });
  });
  it('widens an existing database without changing rows or audit hashes', () => {
    const { db, repo, tx } = setup(); const legacy = new DatabaseSync(':memory:'); dbs.push(legacy);
    for (const name of ['users', 'transactions', 'events']) {
      const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(name)!;
      legacy.exec(String(row.sql).replace("'PARTIALLY_REFUNDED',", ''));
      const rows = db.prepare(`SELECT * FROM ${name}`).all();
      for (const data of rows) legacy.prepare(`INSERT INTO ${name} (${Object.keys(data).join(',')}) VALUES (${Object.keys(data).map(() => '?').join(',')})`).run(...Object.values(data));
    }
    migrate(legacy); migrate(legacy); const migrated = new TransactionRepository(legacy);
    expect(migrated.loadTransaction(tx.id)).toEqual(repo.loadTransaction(tx.id)); expect(migrated.readEvents(tx.id)).toEqual(repo.readEvents(tx.id));
    legacy.prepare("UPDATE transactions SET status='PARTIALLY_REFUNDED' WHERE id=?").run(tx.id);
    expect(legacy.prepare('PRAGMA foreign_key_check').all()).toEqual([]); expect(verifyChain(migrated.readEvents(tx.id)).ok).toBe(true);
    expect(() => legacy.prepare("DELETE FROM events WHERE tx_id=?").run(tx.id)).toThrow('append-only');
  });
});
