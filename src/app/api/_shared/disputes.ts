import { actOnPayPalDispute, syncPayPalDisputes, type DisputeDeps, type DisputeNote } from '../../../lib/paypalDisputes';
import { loadDraft, PAYPAL_MESSAGE_MAX, type PayPalMessageDraft } from '../../../lib/ai/drafts';
import { getApiContext, getDisputeGateway, isSimulatedPayPal } from './context';
import { HttpError, json, jsonBody, noExtraFields, requireRole, route, stringField } from './http';

export function disputeDeps(actor: string): DisputeDeps {
  const context = getApiContext();
  return { repo: context.repo, paypal: getDisputeGateway(context), now: context.now, actor, simulated: isSimulatedPayPal() };
}
function requireTx(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, 'INVALID_ID', 'Invalid transaction id');
  const tx = getApiContext().repo.loadTransaction(id);
  if (!tx) throw new HttpError(404, 'NOT_FOUND', 'Transaction not found');
  return tx;
}
export function syncDisputes(request: Request) {
  return route(async () => {
    const actor = requireRole(request, ['reviewer']);
    const body = await jsonBody(request); noExtraFields(body, []);
    const results = await syncPayPalDisputes(disputeDeps(actor));
    const failed = results.find(result => result.error);
    return failed ? json({ error: 'PAYPAL_DISPUTE_SYNC_FAILED', message: 'Some PayPal cases could not be checked. Please try again later.', debug_id: failed.debug_id, results }, 502) : json({ results });
  });
}
export function disputeAction(request: Request, id: string, action: 'evidence' | 'escalate') {
  return route(async () => {
    const actor = requireRole(request, ['seller', 'reviewer']);
    const body = await jsonBody(request);
    noExtraFields(body, action === 'escalate' ? ['disputeId', 'confirm'] : ['disputeId', 'note', 'draftId']);
    const disputeId = body.disputeId === undefined ? undefined : stringField(body, 'disputeId', 200);
    if (action === 'escalate' && body.confirm !== true) throw new HttpError(400, 'CONFIRMATION_REQUIRED', 'Confirm escalation to PayPal claim; it cannot be undone');
    requireTx(id);
    if (body.draftId !== undefined && body.note === undefined) throw new HttpError(400, 'INVALID_INPUT', 'Send the approved note text with its draftId');
    let note: DisputeNote | undefined;
    if (body.note !== undefined) {
      const text = stringField(body, 'note', PAYPAL_MESSAGE_MAX);
      const draftId = body.draftId === undefined ? undefined : stringField(body, 'draftId', 64);
      const draft = draftId ? loadDraft<PayPalMessageDraft>(getApiContext().db, draftId, id, 'paypal-message') : undefined;
      if (draftId && !draft) throw new HttpError(404, 'NOT_FOUND', 'Draft not found for this deal');
      note = { text, ...(draft ? { draft } : {}) };
    }
    return json(await actOnPayPalDispute(id, disputeId, action, disputeDeps(actor), note));
  });
}
export function openSimulatedPayPalDispute(request: Request, id: string) {
  return route(async () => {
    const actor = requireRole(request, ['buyer', 'reviewer']);
    const body = await jsonBody(request); noExtraFields(body, []);
    if (!isSimulatedPayPal()) throw new HttpError(404, 'NOT_FOUND', 'Simulation is not enabled');
    const tx = requireTx(id);
    if (tx.status !== 'COMPLETED' || !tx.captured || !tx.item.startsWith('[Demo]') || JSON.parse(tx.termsJson).demo !== true || !/^(SIM|DEMO)-/.test(tx.paypalCaptureId ?? '')) {
      throw new HttpError(409, 'INVALID_STATE', 'Choose a completed labelled demo deal to open a simulated PayPal dispute');
    }
    const context = getApiContext();
    getDisputeGateway(context);
    await context.simulatedPayPal!.openSimulatedDispute(tx.paypalCaptureId!);
    return json({ simulated: true, results: await syncPayPalDisputes(disputeDeps(actor)), message: 'Simulated PayPal dispute opened. No request was sent to PayPal.' });
  });
}
