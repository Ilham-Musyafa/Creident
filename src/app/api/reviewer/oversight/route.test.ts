import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';
import { seedDemoUsers, setApiContextForTests } from '../../_shared/context';
import { openDatabase } from '../../../../lib/db';
import { TransactionRepository } from '../../../../lib/repository';
import { seedDemoData } from '../../../../lib/demoSeed';
import { oversightSnapshot } from '../../../../lib/oversight';
import type { OversightSnapshot } from '../../../../lib/oversight';
import type { AuditChains } from '../../../../lib/audit/checkpoint';

const now = '2026-10-22T10:00:00.000Z';
const time = { shipByDays: 3, inspectionDays: 2, evidenceDays: 2, returnDays: 3 };
const request = (role?: string, code?: string, cookie?: string) => new Request('http://localhost/api/reviewer/oversight', {
  headers: { ...(role ? { 'x-demo-role': role } : {}), ...(code ? { 'x-reviewer-code': code } : {}), ...(cookie ? { cookie } : {}) },
});
let db: DatabaseSync; let repo: TransactionRepository;
beforeEach(() => {
  vi.stubEnv('REVIEWER_ACCESS_CODE', ''); db = openDatabase(':memory:'); seedDemoUsers(db); repo = new TransactionRepository(db);
  setApiContextForTests({ db, repo, time, now: () => now });
});
afterEach(() => { setApiContextForTests(null); db.close(); vi.unstubAllEnvs(); });

describe('read-only reviewer oversight', () => {
  it('requires a reviewer role and enforces the reviewer gate by header or cookie', async () => {
    expect((await GET(request())).status).toBe(400);
    expect((await GET(request('admin'))).status).toBe(400);
    for (const role of ['buyer', 'seller']) expect((await GET(request(role))).status).toBe(403);
    vi.stubEnv('REVIEWER_ACCESS_CODE', 'synthetic-code');
    expect((await GET(request('reviewer'))).status).toBe(403);
    expect((await GET(request('reviewer', 'wrong'))).status).toBe(403);
    expect((await GET(request('reviewer', 'synthetic-code'))).status).toBe(200);
    expect((await GET(request('reviewer', undefined, 'hv-reviewer-code=synthetic-code'))).status).toBe(200);
  });

  it('returns an honest empty snapshot without NaN or an invented escalation rate', async () => {
    const response = await GET(request('reviewer')); expect(response.headers.get('cache-control')).toBe('no-store');
    const value = await response.json();
    expect(value).toMatchObject({ totalDeals: 0, demoDeals: 0, escalation: { rate: null, recommendations: 0 },
      disputes: [], deadlines: [], assists: [], paypal: [], audit: { verified: 0, failed: 0, empty: 0 } });
  });

  it('populates every widget from labelled seeded data without writes or provider calls', async () => {
    await seedDemoData({ repo, time, now: () => now });
    const before = db.prepare('SELECT * FROM events ORDER BY tx_id, seq').all();
    const transactions = repo.listTransactions();
    const response = await GET(request('reviewer')); const value: OversightSnapshot = await response.json();
    expect(response.status).toBe(200); expect(value.totalDeals).toBe(13); expect(value.demoDeals).toBe(13);
    expect(value.disputes.length).toBeGreaterThan(0); expect(value.deadlines.length).toBeGreaterThan(0);
    expect(value.escalation).toEqual({ escalated: 3, recommendations: 3, rate: 1 });
    expect(value.assists).toEqual(expect.arrayContaining([
      expect.objectContaining({ feature: 'terms', created: 1, edited: 1 }),
      expect.objectContaining({ feature: 'copilot', created: 1 }),
    ]));
    expect(value.paypal).toEqual([{ status: 'Waiting for seller', stage: 'Inquiry', count: 1, simulated: true }]);
    expect(value.audit).toMatchObject({ verified: 13, failed: 0, empty: 0 });
    expect(value.audit.events).toBe(before.length);
    expect(db.prepare('SELECT * FROM events ORDER BY tx_id, seq').all()).toEqual(before);
    expect(repo.listTransactions()).toEqual(transactions);
    const text = JSON.stringify(value);
    expect(text).not.toContain('bubble wrap'); expect(text).not.toContain('promptHash'); expect(text).not.toContain('output_json');
    const tx = transactions.find(t => t.item === '[Demo] Board game (PayPal case)')!;
    expect(tx).toMatchObject({ status: 'FROZEN_EXTERNAL', frozenFrom: 'COMPLETED', captured: true });
    expect(repo.readEvents(tx.id).filter(e => ['PAYPAL_DISPUTE_DETECTED', 'EXTERNAL_DISPUTE'].includes(e.type)))
      .toHaveLength(2);
  });

  it('keeps overdue and frozen deadlines visible, sorted, with remaining time', async () => {
    await seedDemoData({ repo, time, now: () => now });
    const tx = repo.listTransactions().find(t => t.status === 'AUTHORIZED')!;
    db.prepare('UPDATE transactions SET ship_by = ? WHERE id = ?').run('2026-10-22T09:00:00.000Z', tx.id);
    const value = oversightSnapshot(db, repo, now);
    expect(value.deadlines[0]).toMatchObject({ txId: tx.id, kind: 'Ship by', remainingMinutes: -60, frozen: false, simulated: true });
    expect(value.deadlines.some(d => d.frozen)).toBe(true);
    expect(value.deadlines.map(d => d.dueAt)).toEqual([...value.deadlines.map(d => d.dueAt)].sort());
  });

  it('verifies chains and carries real checkpoint verification results, including failure', async () => {
    await seedDemoData({ repo, time, now: () => now });
    const checkpoint = vi.fn((_chains: AuditChains) => ({ available: true as const, result: { valid: false as const, reason: 'Checkpoint signature verification failed' } }));
    const tx = repo.listTransactions()[0]!;
    db.exec('DROP TRIGGER events_no_update');
    db.prepare('UPDATE events SET hash = ? WHERE tx_id = ? AND seq = 1').run('0'.repeat(64), tx.id);
    const value = oversightSnapshot(db, repo, now, checkpoint);
    expect(value.audit).toMatchObject({ verified: 12, failed: 1, checkpoint: { available: true, result: { valid: false } } });
    expect(checkpoint).toHaveBeenCalledOnce(); expect(checkpoint.mock.calls[0]![0].size).toBe(13);
  });

  it('does not silently truncate the snapshot at the UI list limit', () => {
    for (let i = 0; i < 205; i++) repo.insertTransaction({ id: `tx-${i}`, item: 'Synthetic', amount: '1.00', currency: 'USD', termsJson: '{}',
      status: 'DRAFT', captured: false, buyerId: 'buyer', sellerId: 'seller' });
    expect(oversightSnapshot(db, repo, now).totalDeals).toBe(205);
  });
});
