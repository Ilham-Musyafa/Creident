import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../../lib/db';
import { TransactionRepository, type StoredTx } from '../../lib/repository';
import { seedDemoData } from '../../lib/demoSeed';
import { verifyChain } from '../../lib/audit/chain';
import { createSimulatedPayPal } from '../../lib/paypal/simulated';
import { PayPalError } from '../../lib/paypal/client';
import { PartialRefundNotice } from '../../components/PartialRefundNotice';
import Receipt from '../deals/[id]/decision/page';
import { getApiContext, seedDemoUsers, setApiContextForTests } from './_shared/context';
import { POST as tick } from './jobs/tick/route';
import { POST as review } from './transactions/[id]/review/route';
import { POST as copilot } from './transactions/[id]/ai/copilot/route';
import { POST as returned } from './transactions/[id]/return/route';

// Receipt assertions use React's synchronous legacy renderer, not the Next RSC pipeline.
// Keep receipt content/controls intact; the async cookie-based shell is browser-tested separately.
vi.mock('../../components/layout', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../components/layout')>(),
  AppShell: ({ children }: { children: ReactNode }) => children,
}));

let db: DatabaseSync; let repo: TransactionRepository; let tx: StoredTx;
const param = () => ({ params: Promise.resolve({ id: tx.id }) });
const req = (body: unknown, role = 'reviewer') => new Request('http://localhost/test', { method: 'POST', headers: { 'content-type': 'application/json', 'x-demo-role': role }, body: JSON.stringify(body) });
const body = (extra = {}) => ({ outcome: 'PARTIAL_REFUND', amount: '12.00', reason: 'Human reviewer values the damage at 12 USD after checking the evidence.', ...extra });
beforeEach(async () => {
  vi.stubEnv('PAYPAL_MODE', 'simulated'); vi.stubEnv('REVIEWER_ACCESS_CODE', '');
  db = openDatabase(':memory:'); seedDemoUsers(db); repo = new TransactionRepository(db);
  const ctx = { db, repo, time: { shipByDays: 3, inspectionDays: 2, evidenceDays: 2, returnDays: 3 }, now: () => '2026-10-22T00:00:00.000Z', aiEnv: { AI_MODE: 'replay' } };
  setApiContextForTests(ctx); await seedDemoData(ctx); tx = repo.listTransactions().find(t => t.item === '[Demo] Smartwatch')!;
});
afterEach(() => { setApiContextForTests(null); db.close(); vi.unstubAllEnvs(); });
describe('partial refund review API and receipt', () => {
  it.each([undefined, 12, '0.00', '64.00', '64.01', '-1.00', '12', '12.0', '12.001', 'USD 12.00'])('rejects invalid amount %s before any money call or decision', async amount => {
    expect((await review(req(body({ amount })), param())).status).toBe(400);
    expect(repo.loadTransaction(tx.id)?.status).toBe('UNDER_REVIEW'); expect(repo.loadDecisions(tx.id)).toEqual([]);
  });
  it('checks roles, reviewer gate, human reason and limits', async () => {
    for (const role of ['buyer', 'seller']) expect((await review(req(body(), role), param())).status).toBe(403);
    expect((await review(req(body({ reason: '' })), param())).status).toBe(400);
    expect((await review(req(body({ requireReturn: 'yes' })), param())).status).toBe(400);
    expect((await review(req(body({ outcome: 'REFUND' })), param())).status).toBe(400);
    vi.stubEnv('REVIEWER_ACCESS_CODE', 'synthetic-gate'); expect((await review(req(body()), param())).status).toBe(403);
  });
  it('executes a simulated partial refund with no return by default, records AI provenance and shows amount on receipt', async () => {
    const draft = await (await copilot(req({}), param())).json();
    const gateway = createSimulatedPayPal(); getApiContext().simulatedPayPal = gateway;
    const refund = vi.spyOn(gateway, 'refundCapture');
    const response = await review(req(body({ reason: draft.draft.reason, copilotDraftId: draft.draftId })), param());
    expect(response.status).toBe(200); expect((await response.json()).transaction).toMatchObject({ status: 'PARTIALLY_REFUNDED', partialRefundAmount: '12.00' });
    expect(refund).toHaveBeenCalledWith(expect.stringMatching(/^SIM-CAPTURE/), expect.any(String), { currency: 'USD', value: '12.00' });
    for (const event of repo.readEvents(tx.id).filter(e => ['DECISION', 'PARTIAL_REFUND_CAPTURED', 'PARTIAL_REFUND_COMPLETED'].includes(e.type))) {
      expect(event.payload).toMatchObject({ amount: '12.00', simulated: true, aiDraft: { accepted: 'unchanged', feature: 'copilot' }, termsHash: expect.any(String), evidenceDigest: expect.any(String) });
    }
    const html = renderToStaticMarkup(await Receipt(param())); expect(html).toContain('Partial refund issued: $12.00'); expect(html).toContain('Reviewer refund amount:');
    expect(verifyChain(repo.readEvents(tx.id)).ok).toBe(true);
    expect((await review(req(body({ reason: draft.draft.reason, copilotDraftId: draft.draftId })), param())).status).toBe(200); expect(refund).toHaveBeenCalledTimes(1);
  });
  it('records edited copilot reasons and does not fill the amount from its range', async () => {
    const draft = await (await copilot(req({}), param())).json();
    const response = await review(req(body({ reason: draft.draft.reason + ' Human chose a different amount.', copilotDraftId: draft.draftId, amount: '3.50' })), param());
    expect(response.status).toBe(200); expect(repo.loadDecisions(tx.id)[0]?.amount).toBe('3.50');
    expect(repo.readEvents(tx.id).find(e => e.type === 'DECISION')?.payload.aiDraft).toMatchObject({ accepted: 'edited' });
  });
  it('keeps a refund failure COMPLETED, shows pending/debug id, and never blindly retries', async () => {
    const gateway = createSimulatedPayPal(); getApiContext().simulatedPayPal = gateway;
    const refund = vi.spyOn(gateway, 'refundCapture').mockRejectedValue(new PayPalError(422, 'UNPROCESSABLE_ENTITY', 'REFUND_FAILED', 'demo-debug', 'private provider text'));
    expect((await review(req(body()), param())).status).toBe(502);
    expect(repo.loadTransaction(tx.id)).toMatchObject({ status: 'COMPLETED', partialRefundState: 'pending' });
    const html = renderToStaticMarkup(await Receipt(param())); expect(html).toContain('Refund pending'); expect(html).toContain('demo-debug'); expect(html).not.toContain('private provider text');
    const notice = renderToStaticMarkup(PartialRefundNotice({ tx: repo.loadTransaction(tx.id)!, events: repo.readEvents(tx.id) })); expect(notice).toContain('Refund pending');
    expect((await review(req(body()), param())).status).toBe(502); expect(refund).toHaveBeenCalledTimes(1);
    expect((await tick(req({}))).status).toBe(200); expect(refund).toHaveBeenCalledTimes(1);
    expect((await review(req({ outcome: 'RELEASE', reason: 'Different action' }), param())).status).toBe(409);
    expect(verifyChain(repo.readEvents(tx.id)).ok).toBe(true);
  });
  it('waits for a required return, then executes only the recorded partial amount', async () => {
    const gateway = createSimulatedPayPal(); getApiContext().simulatedPayPal = gateway; const capture = vi.spyOn(gateway, 'captureAuthorization');
    expect((await review(req(body({ requireReturn: true })), param())).status).toBe(200);
    expect(repo.loadTransaction(tx.id)?.status).toBe('RETURN_REQUESTED'); expect(capture).not.toHaveBeenCalled();
    expect((await returned(req({ tracking: 'DEMO-DELIVERED' }, 'buyer'), param())).status).toBe(200);
    expect(repo.loadTransaction(tx.id)?.status).toBe('PARTIALLY_REFUNDED');
    expect((await returned(req({ tracking: 'DEMO-DELIVERED' }, 'buyer'), param())).status).toBe(200); expect(capture).toHaveBeenCalledTimes(1);
  });
  it('keeps SPLIT recorded only and blocks executing a partial refund over it', async () => {
    expect((await review(req({ outcome: 'SPLIT', reason: 'Human split pending allocation.' }), param())).status).toBe(200);
    expect((await review(req(body()), param())).status).toBe(409); expect(repo.loadTransaction(tx.id)?.status).toBe('UNDER_REVIEW');
  });
});
