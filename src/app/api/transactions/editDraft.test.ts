import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { openDatabase } from '../../../lib/db';
import { TransactionRepository, type StoredTx } from '../../../lib/repository';
import { draftRevision, DraftTermsChangedError } from '../../../lib/draftTerms';
import { verifyChain } from '../../../lib/audit/chain';
import { getTimeConfig } from '../../../lib/timeConfig';
import { seedDemoUsers, setApiContextForTests } from '../_shared/context';
import { POST as create } from './route';
import { PATCH as edit } from './[id]/edit/route';
import { POST as accept } from './[id]/accept/route';

let db: DatabaseSync, repo: TransactionRepository;
const now = '2026-10-31T12:00:00Z';
const input = { item: 'Camera', amount: '45.00', terms: { condition: 'Used - Good', description: '<script>quoted data</script>', category: 'electronics-computers', subcategory: 'electronics-computers-cameras', includedItems: ['Cable'], criteria: ['No cracks'] } };
const params = (id: string) => ({ params: Promise.resolve({ id }) });
function request(body: unknown, role = 'seller', method = 'PATCH') { return new Request('http://localhost/api/transactions/edit', { method, headers: { 'x-demo-role': role, 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
async function draft() { const res = await create(request(input, 'seller', 'POST')); expect(res.status).toBe(201); return (await res.json()).transaction as StoredTx; }
async function save(tx: StoredTx, change: Record<string, unknown> = {}, role = 'seller') { return edit(request({ ...input, amount: '70.00', revision: draftRevision(tx), ...change }, role), params(tx.id)); }
beforeEach(() => { db = openDatabase(':memory:'); seedDemoUsers(db); repo = new TransactionRepository(db); setApiContextForTests({ db, repo, now: () => now, time: getTimeConfig({}) }); });
afterEach(() => { setApiContextForTests(null); db.close(); });

describe('Draft edit server boundary', () => {
  it('updates in place, resets seller acceptance and appends exactly one metadata-only event with a valid chain', async () => {
    const tx = await draft();
    await accept(request({}, 'seller', 'POST'), params(tx.id));
    const before = repo.readEvents(tx.id);
    expect((await save(tx, { terms: { ...input.terms, condition: 'New' } })).status).toBe(200);
    const updated = repo.loadTransaction(tx.id)!;
    expect(updated).toMatchObject({ id: tx.id, status: 'DRAFT', amount: '70.00', captured: false });
    expect(JSON.parse(updated.termsJson).condition).toBe('New');
    expect(repo.listAcceptances(tx.id)).toEqual([]);
    const events = repo.readEvents(tx.id);
    expect(events).toHaveLength(before.length + 1);
    expect(events.slice(0, -1)).toEqual(before);
    expect(events.at(-1)).toMatchObject({ type: 'TERMS_EDITED', actor: 'seller', payload: { changedFields: ['amount', 'terms.condition'] } });
    expect(JSON.stringify(events.at(-1)?.payload)).not.toContain('quoted data');
    expect(verifyChain(events).ok).toBe(true);
  });
  it.each(['TERMS_LOCKED','AWAITING_APPROVAL','AUTHORIZED','SHIPPED','IN_INSPECTION','DISPUTED','UNDER_REVIEW','RETURN_REQUESTED','FROZEN_EXTERNAL','COMPLETED','REFUNDED','PARTIALLY_REFUNDED','VOIDED','CANCELLED'] as const)('refuses %s on the server without writes', async status => {
    const tx = await draft(); db.prepare('UPDATE transactions SET status = ? WHERE id = ?').run(status, tx.id);
    const before = repo.loadTransaction(tx.id), events = repo.readEvents(tx.id);
    expect((await save(tx)).status).toBe(409);
    expect(repo.loadTransaction(tx.id)).toEqual(before); expect(repo.readEvents(tx.id)).toEqual(events);
  });
  it('refuses buyer-first acceptance even while status remains DRAFT', async () => {
    const tx = await draft(); await accept(request({}, 'buyer', 'POST'), params(tx.id));
    const events = repo.readEvents(tx.id);
    const response = await save(tx);
    expect(response.status).toBe(409); expect((await response.json()).message).toBe('Terms are locked because the buyer accepted');
    expect(repo.loadTransaction(tx.id)).toEqual(tx); expect(repo.listAcceptances(tx.id)).toEqual(['buyer']); expect(repo.readEvents(tx.id)).toEqual(events);
  });
  it.each(['buyer','reviewer'])('refuses the %s role without writes', async role => {
    const tx = await draft(); expect((await save(tx, {}, role)).status).toBe(403); expect(repo.readEvents(tx.id)).toHaveLength(1);
  });
  it('refuses a stale seller form and a buyer accepting a page rendered before the edit', async () => {
    const tx = await draft(); expect((await save(tx)).status).toBe(200);
    const events = repo.readEvents(tx.id);
    expect((await save(tx)).status).toBe(409);
    const refused = await accept(request({ revision: draftRevision(tx) }, 'buyer', 'POST'), params(tx.id));
    expect(refused.status).toBe(409); expect((await refused.json()).error).toBe('TERMS_CHANGED');
    expect(repo.listAcceptances(tx.id)).toEqual([]); expect(repo.readEvents(tx.id)).toEqual(events);
    const latest = repo.loadTransaction(tx.id)!;
    expect((await accept(request({ revision: draftRevision(latest) }, 'seller', 'POST'), params(tx.id))).status).toBe(200);
    expect((await accept(request({ revision: draftRevision(latest) }, 'buyer', 'POST'), params(tx.id))).status).toBe(200);
    expect(repo.loadTransaction(tx.id)?.status).toBe('TERMS_LOCKED'); expect(verifyChain(repo.readEvents(tx.id)).ok).toBe(true);
  });
  it('checks the current stored terms under the acceptance write lock, even for legacy clients', async () => {
    const tx = await draft(); await save(tx, { terms: { condition: 'New' } });
    const staleHash = createHash('sha256').update(tx.termsJson).digest('hex');
    expect(() => repo.recordAcceptance(tx.id, 'buyer', staleHash, now)).toThrow(DraftTermsChangedError);
    expect(repo.listAcceptances(tx.id)).toEqual([]);
  });
  it('rolls the data and acceptance reset back if audit append fails', async () => {
    const tx = await draft(); await accept(request({}, 'seller', 'POST'), params(tx.id));
    const events = repo.readEvents(tx.id);
    db.exec("CREATE TRIGGER reject_edit BEFORE INSERT ON events WHEN NEW.type = 'TERMS_EDITED' BEGIN SELECT RAISE(ABORT, 'test append failure'); END");
    expect(() => repo.editDraft(tx.id, { ...tx, amount: '70.00' }, draftRevision(tx), now)).toThrow('test append failure');
    expect(repo.loadTransaction(tx.id)).toEqual(tx); expect(repo.listAcceptances(tx.id)).toEqual(['seller']); expect(repo.readEvents(tx.id)).toEqual(events);
  });
  it.each([{ amount: '0.00' }, { amount: '7.001' }, { item: 'x'.repeat(201) }, { terms: [] }, { currency: 'EUR' }, { terms: { description: 'x'.repeat(8193) } }])('uses the same creation validation for %j', async invalid => {
    const tx = await draft(); const creation = await create(request({ ...input, ...invalid }, 'seller', 'POST')); const editing = await save(tx, invalid);
    expect(editing.status).toBe(creation.status); expect(editing.status).toBeGreaterThanOrEqual(400); expect(repo.loadTransaction(tx.id)).toEqual(tx); expect(repo.readEvents(tx.id)).toHaveLength(1);
  });
  it('does not export a DELETE route anywhere in the API', () => {
    function walk(dir: string): string[] { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir,e.name)) : e.name === 'route.ts' ? [join(dir,e.name)] : []); }
    for (const path of walk('src/app/api')) expect(readFileSync(path,'utf8')).not.toMatch(/export\s+(?:async\s+function\s+DELETE|(?:const|let)\s+DELETE|\{[^}]*\bDELETE\b)/);
  });
});
