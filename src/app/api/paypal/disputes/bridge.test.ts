import { createHash, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase, migrate } from '../../../../lib/db';
import { TransactionRepository } from '../../../../lib/repository';
import { canonicalJson, verifyChain } from '../../../../lib/audit/chain';
import { PayPalClient, PayPalError } from '../../../../lib/paypal/client';
import { disputeDocument } from '../../../../lib/paypalDisputes';
import { getApiContext, seedDemoUsers, setApiContextForTests } from '../../_shared/context';
import { POST as sync } from './sync/route';
import { POST as evidence } from '../../transactions/[id]/paypal-dispute/evidence/route';
import { POST as escalate } from '../../transactions/[id]/paypal-dispute/escalate/route';
import { POST as simulate } from '../../transactions/[id]/paypal-dispute/simulate/route';
import { POST as tick } from '../../jobs/tick/route';
import { POST as webhook } from '../../webhooks/paypal/route';

let db: DatabaseSync, repo: TransactionRepository, txId: string;
let remoteStatus: string, actions: string[], stage: string, failSend: boolean;
let sent: string[], pdf: string, messages: string[], sellerCapture: string, failRead: boolean;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const now = '2026-10-21T00:00:00.000Z';
const termsJson = canonicalJson({ condition: 'Synthetic item, intact', demo: true });
const params = () => ({ params: Promise.resolve({ id: txId }) });
function post(role: string, body: unknown = {}) {
  return new Request('http://localhost/api', { method: 'POST', headers: { 'x-demo-role': role, 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
function notification(type: string, id: string) {
  return new Request('http://localhost/api/webhooks/paypal', { method: 'POST', headers: {
    'content-type': 'application/json', 'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://example.test/cert',
    'paypal-transmission-id': id, 'paypal-transmission-sig': 'fake', 'paypal-transmission-time': now,
  }, body: JSON.stringify({ id, event_type: type, resource: { id: 'case-1', disputed_transactions: [{ seller_transaction_id: 'capture-1' }] } }) });
}

beforeEach(() => {
  vi.stubEnv('PAYPAL_MODE', 'sandbox'); vi.stubEnv('REVIEWER_ACCESS_CODE', ''); vi.stubEnv('PP_WEBHOOK_ID', 'fake-webhook');
  db = openDatabase(':memory:'); seedDemoUsers(db); repo = new TransactionRepository(db); txId = randomUUID();
  repo.createTransaction({ id: txId, status: 'COMPLETED', captured: true, buyerId: 'buyer', sellerId: 'seller', item: '[Demo] Synthetic parcel',
    amount: '10.00', currency: 'USD', termsJson, termsHash: sha(termsJson), paypalOrderId: 'order-1', paypalAuthId: 'auth-1', paypalCaptureId: 'capture-1', trackingNumber: 'DEMO-DELIVERED' },
  { txId, ts: now, actor: 'system', type: 'TRANSACTION_CREATED', payload: { demo: true } });
  repo.recordEvidence({ txId, submittedBy: 'seller', kind: 'note', content: 'Synthetic packing evidence (quoted) \\ text.', contentHash: sha('Synthetic packing evidence (quoted) \\ text.'), ts: now });
  remoteStatus = 'WAITING_FOR_SELLER_RESPONSE'; actions = ['provide_evidence']; stage = 'CHARGEBACK'; failSend = false;
  sent = []; pdf = ''; messages = []; sellerCapture = 'capture-1'; failRead = false;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === '/v1/oauth2/token') return Response.json({ access_token: 'throwaway-token', expires_in: 3600 });
    if (url.pathname.endsWith('/verify-webhook-signature')) return Response.json({ verification_status: 'SUCCESS' });
    if (url.pathname === '/v1/customer/disputes') return Response.json({ items: [{ dispute_id: 'case-1', status: remoteStatus, reason: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED' }] });
    if (url.pathname === '/v1/customer/disputes/case-1' && failRead) return Response.json({ name: 'INTERNAL_SERVER_ERROR', debug_id: 'read-debug' }, { status: 500 });
    if (url.pathname === '/v1/customer/disputes/case-1') return Response.json({ dispute_id: 'case-1', status: remoteStatus, dispute_life_cycle_stage: stage,
      reason: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED', disputed_transactions: [{ seller_transaction_id: sellerCapture }], links: actions.map(rel => ({ rel })) });
    const action = url.pathname.split('/').at(-1)!; sent.push(action);
    if (failSend) return Response.json({ name: 'UNPROCESSABLE_ENTITY', debug_id: 'debug-case', details: [{ issue: 'ACTION_NOT_ALLOWED_IN_CURRENT_DISPUTE_STATE' }] }, { status: 422 });
    if (action === 'provide-evidence') {
      expect(init?.body).toBeInstanceOf(FormData);
      const form = init!.body as FormData;
      pdf = await (form.get('evidence-file') as Blob).text();
      expect(JSON.parse(await (form.get('input') as Blob).text()).evidences[0].evidence_type).toBe('OTHER');
      actions = ['provide_supporting_info']; remoteStatus = 'UNDER_REVIEW';
    } else if (action === 'send-message') messages.push(JSON.parse(String(init?.body)).message);
    else if (action === 'escalate') { actions = ['provide_evidence']; stage = 'CHARGEBACK'; }
    else throw new Error('Unexpected fake call');
    return Response.json({});
  };
  setApiContextForTests({ db, repo, paypal: new PayPalClient({ baseUrl: 'https://api-m.sandbox.paypal.com', clientId: 'fake', clientSecret: 'fake', fetchImpl }),
    now: () => now, time: { shipByDays: 3, inspectionDays: 2, evidenceDays: 2, returnDays: 3 } });
});
afterEach(() => { setApiContextForTests(null); db.close(); vi.unstubAllEnvs(); });

describe('PayPal dispute bridge', () => {
  it('polls, stores and freezes once, including duplicate discovery through a verified webhook', async () => {
    expect((await sync(post('reviewer'))).status).toBe(200);
    expect(repo.loadTransaction(txId)).toMatchObject({ status: 'FROZEN_EXTERNAL', frozenFrom: 'COMPLETED' });
    expect(repo.listPayPalDisputes(txId)[0]).toMatchObject({ disputeId: 'case-1', actions: ['provide_evidence'], updatedAt: now });
    const count = repo.readEvents(txId).length;
    await sync(post('reviewer')); expect(repo.readEvents(txId)).toHaveLength(count);
    expect((await webhook(notification('CUSTOMER.DISPUTE.CREATED', 'created'))).status).toBe(200);
    await webhook(notification('CUSTOMER.DISPUTE.CREATED', 'created'));
    const events = repo.readEvents(txId);
    expect(events.filter(e => e.type === 'EXTERNAL_DISPUTE')).toHaveLength(1);
    expect(events.find(e => e.type === 'EXTERNAL_DISPUTE')?.payload).toMatchObject({ source: 'disputes_api', disputeId: 'case-1' });
    expect(events.filter(e => e.type === 'PAYPAL_DISPUTE_DETECTED')).toHaveLength(1);
    expect(verifyChain(events).ok).toBe(true);
  });

  it('supports webhook-first detection and poll resolution without re-freezing on a late created notification', async () => {
    await webhook(notification('CUSTOMER.DISPUTE.CREATED', 'created'));
    await sync(post('reviewer'));
    expect(repo.loadTransaction(txId)?.frozenFrom).toBe('COMPLETED');
    remoteStatus = 'RESOLVED'; actions = [];
    await sync(post('reviewer'));
    expect(repo.loadTransaction(txId)?.status).toBe('COMPLETED');
    await webhook(notification('CUSTOMER.DISPUTE.RESOLVED', 'resolved'));
    await webhook(notification('CUSTOMER.DISPUTE.CREATED', 'late-created'));
    expect(repo.loadTransaction(txId)?.status).toBe('COMPLETED');
    expect(repo.readEvents(txId).filter(e => e.type === 'EXTERNAL_RESOLVED')).toHaveLength(1);
  });

  it('maps a resolution webhook after polling, and ignores a stale open poll response', async () => {
    await sync(post('reviewer'));
    await webhook(notification('CUSTOMER.DISPUTE.RESOLVED', 'resolved-only'));
    expect(repo.loadTransaction(txId)?.status).toBe('COMPLETED');
    await sync(post('reviewer'));
    expect(repo.listPayPalDisputes(txId)[0]?.status).toBe('RESOLVED');
    expect(repo.loadTransaction(txId)?.status).toBe('COMPLETED');
  });

  it('keeps the deal frozen until all known cases are resolved', async () => {
    await sync(post('reviewer'));
    const first = repo.listPayPalDisputes(txId)[0]!;
    repo.savePayPalDispute({ ...first, disputeId: 'another-case' });
    repo.savePayPalDispute({ ...first, status: 'RESOLVED' });
    expect(repo.loadTransaction(txId)?.status).toBe('FROZEN_EXTERNAL');
    repo.savePayPalDispute({ ...first, disputeId: 'another-case', status: 'RESOLVED' });
    expect(repo.loadTransaction(txId)?.status).toBe('COMPLETED');
  });

  it('sends a complete claim PDF with locked terms, evidence hashes, decision reason and audit head', async () => {
    db.prepare("INSERT INTO decisions (id, tx_id, rule_id, outcome, reviewer_id, reason, created_at) VALUES (?, ?, 'HUMAN_REVIEW', 'RELEASE', 'reviewer', ?, ?)").run(randomUUID(), txId, 'Synthetic reviewer reason', now);
    await sync(post('reviewer'));
    const head = repo.readEvents(txId).at(-1)!.hash;
    const response = await evidence(post('seller'), params());
    expect(await response.json()).toMatchObject({ action: 'provide_evidence' });
    expect(sent).toEqual(['provide-evidence']); expect(pdf).toContain('%PDF-1.4');
    expect(pdf).toContain(sha(termsJson)); expect(pdf).toContain(head); expect(pdf).toContain('Synthetic reviewer reason');
    expect(pdf).toContain(sha('Synthetic packing evidence (quoted) \\ text.'));
    expect(repo.readEvents(txId).find(e => e.type === 'PAYPAL_DISPUTE_EVIDENCE_SENT')?.payload).toMatchObject({ headHash: head });
    expect(repo.loadTransaction(txId)?.status).toBe('FROZEN_EXTERNAL');
    expect(verifyChain(repo.readEvents(txId)).ok).toBe(true);
  });

  it('sends only a short message for inquiry and does not duplicate the same submission', async () => {
    actions = ['send_message', 'escalate']; stage = 'INQUIRY';
    await sync(post('reviewer'));
    expect(await (await evidence(post('reviewer'), params())).json()).toMatchObject({ action: 'send_message', message: expect.stringContaining('claim stage') });
    expect(sent).toEqual(['send-message']); expect(messages[0]).toContain('PDF evidence needs the claim stage'); expect(pdf).toBe('');
    expect(await (await evidence(post('seller'), params())).json()).toMatchObject({ alreadySent: true });
    expect(sent).toEqual(['send-message']);
  });

  it('requires explicit confirmation and current PayPal permission before escalating', async () => {
    actions = ['send_message']; stage = 'INQUIRY'; await sync(post('reviewer'));
    expect((await escalate(post('seller'), params())).status).toBe(400);
    expect((await escalate(post('seller', { confirm: true }), params())).status).toBe(409);
    expect(sent).toEqual([]);
    actions = ['escalate'];
    expect(await (await escalate(post('seller', { confirm: true }), params())).json()).toMatchObject({ action: 'escalate' });
    expect(sent).toEqual(['escalate']);
    expect((await escalate(post('seller', { confirm: true }), params())).status).toBe(409);
    expect(sent).toEqual(['escalate']);
  });

  it('checks fresh actions, records PayPal debug_id on failure, and leaves the deal frozen', async () => {
    await sync(post('reviewer')); actions = [];
    expect((await evidence(post('seller'), params())).status).toBe(409); expect(sent).toEqual([]);
    actions = ['provide_evidence']; failSend = true;
    const response = await evidence(post('seller'), params());
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ debug_id: 'debug-case' });
    expect(repo.readEvents(txId).at(-1)).toMatchObject({ type: 'PAYPAL_DISPUTE_ACTION_FAILED', payload: { debug_id: 'debug-case' } });
    expect(repo.loadTransaction(txId)?.status).toBe('FROZEN_EXTERNAL');
    expect((await evidence(post('seller'), params())).status).toBe(409); expect(sent).toHaveLength(1);
  });

  it('refuses altered locked terms and unverified audit data', async () => {
    await sync(post('reviewer'));
    db.prepare('UPDATE transactions SET terms_json = ? WHERE id = ?').run('{"changed":true}', txId);
    expect((await evidence(post('seller'), params())).status).toBe(409); expect(sent).toEqual([]);
    expect(() => disputeDocument(txId, repo)).toThrow('Locked terms');
    db.prepare('UPDATE transactions SET terms_json = ? WHERE id = ?').run(termsJson, txId);
    db.prepare('UPDATE evidence SET content_ref = ? WHERE tx_id = ?').run('Altered evidence', txId);
    expect((await evidence(post('seller'), params())).status).toBe(409);
    expect(() => disputeDocument(txId, repo)).toThrow('Evidence no longer matches');
  });

  it('enforces roles, input checks, reviewer gate and disabled simulation', async () => {
    expect((await sync(post('seller'))).status).toBe(403);
    expect((await evidence(post('buyer'), params())).status).toBe(403);
    expect((await escalate(post('buyer', { confirm: true }), params())).status).toBe(403);
    expect((await evidence(post('seller'), { params: Promise.resolve({ id: 'bad' }) })).status).toBe(400);
    expect((await evidence(post('seller'), { params: Promise.resolve({ id: randomUUID() }) })).status).toBe(404);
    expect((await evidence(post('seller', { surprise: true }), params())).status).toBe(400);
    expect((await simulate(post('buyer'), params())).status).toBe(404);
    vi.stubEnv('REVIEWER_ACCESS_CODE', 'throwaway-gate');
    expect((await sync(post('reviewer'))).status).toBe(403);
    expect(sent).toEqual([]);
  });

  it('gates every reviewer bridge entry point before any provider call', async () => {
    vi.stubEnv('REVIEWER_ACCESS_CODE', 'throwaway-gate');
    for (const [handler, body] of [
      [sync, {}], [tick, {}], [evidence, {}], [escalate, { confirm: true }], [simulate, {}],
    ] as const) {
      expect((await handler(post('reviewer', body), params())).status).toBe(403);
    }
    const allowed = post('reviewer'); allowed.headers.set('x-reviewer-code', 'throwaway-gate');
    expect((await sync(allowed)).status).toBe(200);
    expect(sent).toEqual([]);
  });

  it('rejects oversized bodies, extra fields and invalid confirmation values', async () => {
    expect((await sync(post('reviewer', { extra: true }))).status).toBe(400);
    expect((await evidence(post('seller', { disputeId: 'x'.repeat(201) }), params())).status).toBe(400);
    expect((await escalate(post('seller', { confirm: 'true' }), params())).status).toBe(400);
    expect((await evidence(post('seller', { disputeId: 'x'.repeat(17_000) }), params())).status).toBe(413);
    expect(sent).toEqual([]);
  });

  it.each(['unexpected', 'paypal'] as const)('keeps %s descriptions and tokens out of responses and audit failures', async kind => {
    await sync(post('reviewer'));
    const client = getApiContext().paypal!;
    const marker = 'throwaway-sensitive-response-marker';
    vi.spyOn(client, 'provideEvidence').mockRejectedValue(kind === 'paypal'
      ? new PayPalError(422, 'UNPROCESSABLE_ENTITY', 'NOT_ALLOWED', 'throwaway-debug', marker) : new Error(marker));
    const response = await evidence(post('seller'), params());
    expect(response.status).toBe(kind === 'paypal' ? 502 : 500);
    expect(await response.text()).not.toContain(marker);
    const events = repo.readEvents(txId);
    expect(events.at(-1)).toMatchObject({ type: 'PAYPAL_DISPUTE_ACTION_FAILED', payload: { code: kind === 'paypal' ? 'UNPROCESSABLE_ENTITY' : 'DISPUTE_ACTION_FAILED' } });
    expect(JSON.stringify(events)).not.toContain(marker);
    expect(JSON.stringify(events)).not.toContain('throwaway-token');
    expect(verifyChain(events).ok).toBe(true);
  });

  it('quotes evidence as PDF string data even when it contains PDF-like operators', async () => {
    const content = ') Tj /OpenAction << /S /JavaScript >> ( \\ endstream';
    repo.recordEvidence({ txId, submittedBy: 'buyer', kind: 'note', content, contentHash: sha(content), ts: now });
    await sync(post('reviewer'));
    expect((await evidence(post('seller'), params())).status).toBe(200);
    expect(pdf).toContain('Content: \\) Tj /OpenAction << /S /JavaScript >> \\(');
    expect(pdf).toContain(sha(content));
    expect(pdf.match(/^endstream$/gm)).toHaveLength(1);
  });

  it('does not trust a list entry that maps to another capture, and shows read failures', async () => {
    sellerCapture = 'another-capture';
    expect((await sync(post('reviewer'))).status).toBe(502);
    expect(repo.loadTransaction(txId)?.status).toBe('COMPLETED');
    expect(repo.listPayPalDisputes(txId)).toEqual([]);
    sellerCapture = 'capture-1'; failRead = true;
    const response = await sync(post('reviewer'));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ debug_id: 'read-debug' });
    expect(repo.readEvents(txId).at(-1)).toMatchObject({ type: 'PAYPAL_DISPUTE_ACTION_FAILED', payload: { debug_id: 'read-debug' } });
  });

  it('polls from tick and migrates an existing database without losing events', async () => {
    const before = repo.readEvents(txId);
    db.exec('DROP TABLE paypal_disputes'); migrate(db); migrate(db);
    expect(repo.readEvents(txId)).toEqual(before);
    expect((await tick(post('reviewer'))).status).toBe(200);
    expect(repo.loadTransaction(txId)?.status).toBe('FROZEN_EXTERNAL');
  });

  it('runs the simulated inquiry, message, escalation, and PDF flow without keys and survives gateway recreation', async () => {
    vi.stubEnv('PAYPAL_MODE', 'simulated');
    db.prepare('UPDATE transactions SET paypal_capture_id = ? WHERE id = ?').run('DEMO-CAPTURE-1', txId);
    const opened = await simulate(post('buyer'), params());
    expect(await opened.json()).toMatchObject({ simulated: true });
    expect(repo.loadTransaction(txId)?.status).toBe('FROZEN_EXTERNAL');
    expect(repo.listPayPalDisputes(txId)[0]?.disputeId).toMatch(/^SIM-/);
    expect(await (await evidence(post('seller'), params())).json()).toMatchObject({ action: 'send_message', simulated: true });
    expect(await (await escalate(post('seller', { confirm: true }), params())).json()).toMatchObject({ action: 'escalate', simulated: true });
    getApiContext().simulatedPayPal = undefined;
    expect(await (await evidence(post('seller'), params())).json()).toMatchObject({ action: 'provide_evidence', simulated: true });
    for (const e of repo.readEvents(txId).filter(e => e.type.startsWith('PAYPAL_DISPUTE_') || e.type === 'EXTERNAL_DISPUTE')) expect(e.payload.simulated).toBe(true);
    expect(sent).toEqual([]); expect(verifyChain(repo.readEvents(txId)).ok).toBe(true);
  });
});
