import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase, migrate } from './db';
import { TransactionRepository } from './repository';
import { verifyChain } from './audit/chain';
import { PAYPAL_DISPUTE_MAX_POLL_CALLS, PAYPAL_DISPUTE_WINDOW_DAYS, syncPayPalDisputes, type DisputeClient, type DisputeDeps } from './paypalDisputes';

const now = '2026-10-21T00:00:00.000Z';
const daysAgo = (days: number) => new Date(Date.parse(now) - days * 86_400_000).toISOString();
let db: DatabaseSync, repo: TransactionRepository, deps: DisputeDeps;
let listed: string[], read: string[];
let caseCapture: Map<string, string>;
let serial: number;

function deal(age: number, captureAge?: number, simulated = false) {
  const id = `00000000-0000-4000-8000-${String(++serial).padStart(12, '0')}`;
  const captureId = `${simulated ? 'SIM-' : ''}capture-${serial}`;
  const termsJson = '{"demo":true}';
  repo.createTransaction({ id, status: 'COMPLETED', captured: true, buyerId: 'buyer', sellerId: 'seller',
    item: '[Demo] Synthetic dispute polling', amount: '10.00', currency: 'USD', termsJson,
    termsHash: createHash('sha256').update(termsJson).digest('hex'), paypalCaptureId: captureId },
  { txId: id, ts: daysAgo(age), actor: 'system', type: 'TRANSACTION_CREATED', payload: {} });
  if (captureAge !== undefined) repo.appendAuditEvent({ txId: id, ts: daysAgo(captureAge), actor: 'buyer', type: 'BUYER_CONFIRM', payload: { effect: 'PAYPAL_CAPTURE', paypalCaptureId: captureId } });
  return { id, captureId };
}
function known(tx: ReturnType<typeof deal>, id: string, status = 'UNDER_REVIEW') {
  caseCapture.set(id, tx.captureId);
  repo.savePayPalDispute({ txId: tx.id, disputeId: id, status, stage: 'CHARGEBACK', reason: 'OTHER', actions: [], updatedAt: daysAgo(1) });
}

beforeEach(() => {
  serial = 0; listed = []; read = []; caseCapture = new Map(); db = openDatabase(':memory:'); repo = new TransactionRepository(db);
  for (const role of ['buyer', 'seller', 'reviewer']) db.prepare('INSERT INTO users (id, role, display_name) VALUES (?, ?, ?)').run(role, role, role);
  const paypal: DisputeClient = {
    listDisputes: vi.fn(async args => { listed.push(args?.disputedTransactionId ?? ''); return []; }),
    getDispute: vi.fn(async id => { read.push(id); return { id, status: 'UNDER_REVIEW', stage: 'CHARGEBACK', reason: 'OTHER', sellerTransactionIds: [caseCapture.get(id)!], actions: [], outcome: undefined }; }),
    provideEvidence: vi.fn(), sendDisputeMessage: vi.fn(), escalateDispute: vi.fn(),
  };
  deps = { repo, paypal, now: () => now, actor: 'reviewer', simulated: false };
});
afterEach(() => { db.close(); });

describe('bounded PayPal dispute polling', () => {
  it('uses the 180-day capture window including its boundary, with a creation fallback for legacy rows', async () => {
    expect(PAYPAL_DISPUTE_WINDOW_DAYS).toBe(180);
    const recentCapture = deal(250, 2);
    const boundary = deal(200, 180);
    const expired = deal(200, 181);
    const legacyRecent = deal(2);
    deal(181); deal(200, 180 + 1 / 86_400_000); deal(1, 1, true);
    // Updating an old deal today must not restart its dispute window.
    db.prepare('UPDATE transactions SET updated_at = ? WHERE id = ?').run(now, expired.id);
    await syncPayPalDisputes(deps);
    expect(new Set(listed)).toEqual(new Set([recentCapture.captureId, boundary.captureId, legacyRecent.captureId]));
    expect(read).toEqual([]);
  });

  it('refreshes old known open cases without listing expired captures, and resumes on resolution', async () => {
    const old = deal(400, 300); known(old, 'old-open');
    const closed = deal(400, 300); known(closed, 'old-closed', 'RESOLVED');
    known(deal(400, 300, true), 'SIM-other-mode');
    vi.mocked(deps.paypal.getDispute).mockImplementation(async id => {
      read.push(id); return { id, status: 'RESOLVED', stage: 'CHARGEBACK', reason: 'OTHER', sellerTransactionIds: [old.captureId], actions: [], outcome: undefined };
    });
    await syncPayPalDisputes(deps);
    expect(read).toEqual(['old-open']); expect(listed).toEqual([]);
    expect(repo.loadTransaction(old.id)?.status).toBe('COMPLETED');
    expect(verifyChain(repo.readEvents(old.id)).ok).toBe(true);
  });

  it('prioritizes old cases known only from a verified webhook and stops refreshing after resolution', async () => {
    const old = deal(400, 300);
    caseCapture.set('webhook-case', old.captureId);
    const event = { id: 'created', type: 'CUSTOMER.DISPUTE.CREATED', resourceId: 'webhook-case', relatedIds: [old.captureId], receivedAt: now };
    repo.processVerifiedWebhook(event);
    expect(repo.listPayPalDisputes(old.id)).toEqual([]);
    await syncPayPalDisputes(deps);
    expect(read).toEqual(['webhook-case']); expect(listed).toEqual([]);
    expect(repo.listPayPalDisputes(old.id)).toHaveLength(1);
    repo.processVerifiedWebhook({ ...event, id: 'resolved', type: 'CUSTOMER.DISPUTE.RESOLVED' });
    read = [];
    await syncPayPalDisputes(deps);
    expect(read).toEqual([]);
    expect(repo.loadTransaction(old.id)?.status).toBe('COMPLETED');
    expect(verifyChain(repo.readEvents(old.id)).ok).toBe(true);
  });

  it('caps calls and rotates known open cases across context recreation, even after failures with a fixed clock', async () => {
    const tx = deal(400, 300);
    const count = PAYPAL_DISPUTE_MAX_POLL_CALLS + 7;
    for (let n = 0; n < count; n++) known(tx, `case-${String(n).padStart(3, '0')}`);
    vi.mocked(deps.paypal.getDispute).mockImplementation(async id => { read.push(id); throw new Error('provider unavailable'); });
    const first = await syncPayPalDisputes(deps);
    expect(read).toHaveLength(PAYPAL_DISPUTE_MAX_POLL_CALLS);
    expect(first[0]?.deferred).toBe(true);
    expect(listed).toEqual([]);
    const firstReads = [...read]; read = [];
    // Same SQLite scheduler records survive a new repository/context and idempotent migration.
    migrate(db); deps.repo = new TransactionRepository(db);
    await syncPayPalDisputes(deps);
    expect(read).toHaveLength(PAYPAL_DISPUTE_MAX_POLL_CALLS);
    expect(new Set([...firstReads, ...read]).size).toBe(count);
    expect(repo.loadTransaction(tx.id)?.status).toBe('FROZEN_EXTERNAL');
    expect(verifyChain(repo.readEvents(tx.id)).ok).toBe(true);
  });

  it('rotates discovery captures across runs and gives open cases the first call', async () => {
    const old = deal(400); known(old, 'priority-case');
    const count = PAYPAL_DISPUTE_MAX_POLL_CALLS + 4;
    for (let n = 0; n < count; n++) deal(1);
    let firstCall: string | undefined;
    vi.mocked(deps.paypal.getDispute).mockImplementation(async id => {
      firstCall ??= id; read.push(id); return { id, status: 'UNDER_REVIEW', stage: 'INQUIRY', reason: 'OTHER', sellerTransactionIds: [old.captureId], actions: [], outcome: undefined };
    });
    const first = await syncPayPalDisputes(deps);
    expect(firstCall).toBe('priority-case');
    expect(vi.mocked(deps.paypal.getDispute).mock.invocationCallOrder[0]!).toBeLessThan(vi.mocked(deps.paypal.listDisputes).mock.invocationCallOrder[0]!);
    expect(read.length + listed.length).toBe(PAYPAL_DISPUTE_MAX_POLL_CALLS);
    expect(first.some(r => r.deferred)).toBe(true);
    const firstListed = [...listed]; listed = []; read = [];
    await syncPayPalDisputes(deps);
    expect(read.length + listed.length).toBe(PAYPAL_DISPUTE_MAX_POLL_CALLS);
    expect(new Set([...firstListed, ...listed]).size).toBe(count);
  });

  it('rotates discovery even when every list request fails', async () => {
    const count = PAYPAL_DISPUTE_MAX_POLL_CALLS + 2;
    for (let n = 0; n < count; n++) deal(1);
    vi.mocked(deps.paypal.listDisputes).mockImplementation(async args => {
      listed.push(args?.disputedTransactionId ?? ''); throw new Error('private provider detail');
    });
    const result = await syncPayPalDisputes(deps);
    expect(listed).toHaveLength(PAYPAL_DISPUTE_MAX_POLL_CALLS);
    expect(JSON.stringify(result)).not.toContain('private provider detail');
    const first = [...listed]; listed = [];
    await syncPayPalDisputes(deps);
    expect(listed).toHaveLength(PAYPAL_DISPUTE_MAX_POLL_CALLS);
    expect(new Set([...first, ...listed]).size).toBe(count);
  });

  it('rejects invalid listed IDs before persisting scheduler keys or fetching details', async () => {
    const tx = deal(1);
    vi.mocked(deps.paypal.listDisputes).mockResolvedValue([{ id: 'x'.repeat(201), status: 'OPEN', reason: 'OTHER', stage: 'INQUIRY', amount: null, createdAt: undefined }]);
    await syncPayPalDisputes(deps);
    expect(read).toEqual([]);
    expect(repo.disputePollAttempts('sandbox', 'case').size).toBe(0);
    expect(repo.readEvents(tx.id).at(-1)?.payload.disputeId).toBeNull();
  });

  it('counts list and detail calls together and stops a large returned case list at the budget', async () => {
    const tx = deal(1);
    const ids = Array.from({ length: PAYPAL_DISPUTE_MAX_POLL_CALLS + 10 }, (_, n) => `listed-${n}`);
    for (const id of ids) caseCapture.set(id, tx.captureId);
    vi.mocked(deps.paypal.listDisputes).mockImplementation(async args => {
      listed.push(args?.disputedTransactionId ?? '');
      return ids.concat(ids).map(id => ({ id, status: 'UNDER_REVIEW', reason: 'OTHER', stage: 'INQUIRY', amount: null, createdAt: undefined }));
    });
    const result = await syncPayPalDisputes(deps);
    expect(listed).toHaveLength(1);
    expect(read).toHaveLength(PAYPAL_DISPUTE_MAX_POLL_CALLS - 1);
    expect(new Set(read).size).toBe(read.length);
    expect(result[0]?.deferred).toBe(true);
    expect(repo.listPayPalDisputes(tx.id)).toHaveLength(read.length);
  });
});
