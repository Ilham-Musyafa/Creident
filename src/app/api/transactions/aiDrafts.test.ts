import { createHash, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase } from '../../../lib/db';
import { TransactionRepository } from '../../../lib/repository';
import { canonicalJson, verifyChain } from '../../../lib/audit/chain';
import { seedDemoUsers, setApiContextForTests } from '../_shared/context';
import { POST as createDraft } from './[id]/ai-drafts/route';
import { POST as claimPack } from './[id]/courier-claim/route';
import { POST as simulate } from './[id]/paypal-dispute/simulate/route';
import { POST as evidenceAction } from './[id]/paypal-dispute/evidence/route';

let db: DatabaseSync, repo: TransactionRepository;
const now = '2026-10-22T00:00:00.000Z';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const post = (role: string, body: unknown = {}) => new Request('http://localhost/api', {
  method: 'POST', headers: { 'x-demo-role': role, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

function deal(item: string, status: string, opts: { captured?: boolean; disputeType?: string } = {}) {
  const id = randomUUID();
  const termsJson = canonicalJson({ condition: 'Good, minor scratches', demo: true });
  repo.createTransaction({ id, status: status as never, captured: opts.captured ?? false, buyerId: 'buyer', sellerId: 'seller', item, amount: '64.00', currency: 'USD',
    termsJson, termsHash: sha(termsJson), paypalOrderId: `DEMO-ORDER-${id.slice(0, 8)}`, paypalAuthId: `DEMO-AUTH-${id.slice(0, 8)}`,
    ...(opts.captured ? { paypalCaptureId: `DEMO-CAPTURE-${id.slice(0, 8)}` } : {}), trackingNumber: 'DEMO-DELIVERED' },
  { txId: id, ts: now, actor: 'system', type: 'TRANSACTION_CREATED', payload: { demo: true } });
  if (opts.disputeType) repo.appendAuditEvent({ txId: id, ts: now, actor: 'buyer', type: 'OPEN_DISPUTE', payload: { disputeType: opts.disputeType } });
  for (const [side, kind, content] of [['buyer', 'photo', 'Photo of the watch face: a crack runs across the upper left corner.'], ['seller', 'note', 'Packed in bubble wrap.']] as const) {
    const evidenceId = repo.recordEvidence({ txId: id, submittedBy: side, kind, content, contentHash: sha(content), ts: now });
    void evidenceId;
  }
  return id;
}

beforeEach(() => {
  vi.stubEnv('PAYPAL_MODE', 'simulated'); vi.stubEnv('AI_MODE', 'replay'); vi.stubEnv('REVIEWER_ACCESS_CODE', '');
  db = openDatabase(':memory:'); seedDemoUsers(db); repo = new TransactionRepository(db);
  setApiContextForTests({ db, repo, now: () => now, time: { shipByDays: 3, inspectionDays: 2, evidenceDays: 2, returnDays: 3 } });
});
afterEach(() => { setApiContextForTests(null); db.close(); vi.unstubAllEnvs(); });

describe('courier claim drafts (AI assist #4)', () => {
  it('lets only the seller draft a claim for a damaged-item dispute', async () => {
    const id = deal('[Demo] Smartwatch', 'UNDER_REVIEW', { disputeType: 'damaged' });
    expect((await createDraft(post('buyer', { feature: 'courier-claim' }), params(id))).status).toBe(403);
    expect((await createDraft(post('reviewer', { feature: 'courier-claim' }), params(id))).status).toBe(403);
    const other = deal('[Demo] Smartwatch', 'UNDER_REVIEW', { disputeType: 'not_received' });
    expect((await createDraft(post('seller', { feature: 'courier-claim' }), params(other))).status).toBe(409);
    expect((await createDraft(post('seller', { feature: 'nope' }), params(id))).status).toBe(400);
    expect((await createDraft(post('seller', { feature: 'courier-claim', extra: 1 }), params(id))).status).toBe(400);
  });

  it('drafts, records only metadata, and builds a PDF marked unchanged or edited', async () => {
    const id = deal('[Demo] Smartwatch', 'UNDER_REVIEW', { disputeType: 'damaged' });
    const statusBefore = repo.loadTransaction(id)!.status;
    const res = await createDraft(post('seller', { feature: 'courier-claim' }), params(id));
    const body = await res.json() as { draftId: string; draft: { subject: string; body: string } };
    expect(body.draft.subject).toContain('Damage claim');
    const created = repo.readEvents(id).find((e) => e.type === 'AI_DRAFT_CREATED')!;
    expect(created.payload).toMatchObject({ feature: 'courier-claim', mode: 'replay', promptVersion: 'courier-claim-v1' });
    expect(JSON.stringify(created.payload)).not.toContain('bubble wrap');

    const pdf = await claimPack(post('seller', { draftId: body.draftId, subject: body.draft.subject, body: body.draft.body }), params(id));
    expect(pdf.headers.get('content-type')).toBe('application/pdf');
    const text = Buffer.from(await pdf.arrayBuffer()).toString('latin1');
    expect(text).toContain('%PDF-1.4'); expect(text).toContain(sha('Packed in bubble wrap.'));
    let pack = repo.readEvents(id).filter((e) => e.type === 'COURIER_CLAIM_PACK_CREATED').at(-1)!;
    expect(pack.payload).toMatchObject({ aiDraft: { accepted: 'unchanged', draftId: body.draftId } });

    await claimPack(post('seller', { draftId: body.draftId, subject: body.draft.subject, body: `${body.draft.body} Edited.` }), params(id));
    pack = repo.readEvents(id).filter((e) => e.type === 'COURIER_CLAIM_PACK_CREATED').at(-1)!;
    expect(pack.payload).toMatchObject({ aiDraft: { accepted: 'edited' } });

    await claimPack(post('seller', { subject: 'Typed claim subject', body: 'A typed claim letter without AI help.' }), params(id));
    expect(repo.readEvents(id).at(-1)!.payload).toMatchObject({ noteSource: 'typed' });
    expect((await claimPack(post('seller', { draftId: randomUUID(), subject: 'Subject', body: 'Body text that is long enough' }), params(id))).status).toBe(404);
    expect(repo.loadTransaction(id)!.status).toBe(statusBefore);
    expect(verifyChain(repo.readEvents(id)).ok).toBe(true);
  });

  it('falls back to manual writing when no draft is available', async () => {
    const id = deal('A private sale', 'UNDER_REVIEW', { disputeType: 'damaged' });
    const body = await (await createDraft(post('seller', { feature: 'courier-claim' }), params(id))).json();
    expect(body).toMatchObject({ draft: null, unavailable: 'NO_REPLAY' });
    expect(repo.readEvents(id).some((e) => e.type === 'AI_DRAFT_CREATED')).toBe(false);
  });
});

describe('PayPal message drafts (AI assist #4)', () => {
  it('needs an open PayPal case, then sends the approved note with the record appended', async () => {
    const id = deal('[Demo] Smartwatch', 'COMPLETED', { captured: true });
    expect((await createDraft(post('seller', { feature: 'paypal-message' }), params(id))).status).toBe(409);
    await simulate(post('buyer'), params(id));
    const res = await createDraft(post('seller', { feature: 'paypal-message' }), params(id));
    const body = await res.json() as { draftId: string; draft: { message: string; citedEvidence: string[] } };
    expect(body.draft.citedEvidence).toEqual(['B1', 'S1']);
    expect((await createDraft(post('buyer', { feature: 'paypal-message' }), params(id))).status).toBe(403);

    expect((await evidenceAction(post('seller', { draftId: body.draftId }), params(id))).status).toBe(400);
    const sent = await evidenceAction(post('seller', { note: body.draft.message, draftId: body.draftId }), params(id));
    expect(await sent.json()).toMatchObject({ action: 'send_message', simulated: true });
    const event = repo.readEvents(id).find((e) => e.type === 'PAYPAL_DISPUTE_MESSAGE_SENT')!;
    expect(event.payload).toMatchObject({ aiDraft: { accepted: 'unchanged', feature: 'paypal-message' } });
    expect(event.payload.noteHash).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyChain(repo.readEvents(id)).ok).toBe(true);
  });
});
