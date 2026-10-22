import { createHash } from 'node:crypto';
import { verifyChain } from '../../../lib/audit/chain';
import { draftAudit, draftFor, evidenceAliases, loadDraft, saveDraft, COURIER_BODY_MAX, type CourierClaimDraft, type DraftContext, type DraftFeature } from '../../../lib/ai/drafts';
import { textPdf } from '../../../lib/evidencePdf';
import { getApiContext } from './context';
import { HttpError, json, jsonBody, noExtraFields, requireRole, route, stringField } from './http';

const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

function loadContext(id: string): DraftContext & { headHash: string } {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, 'INVALID_ID', 'Invalid transaction id');
  const { repo } = getApiContext();
  const tx = repo.loadTransaction(id);
  if (!tx) throw new HttpError(404, 'NOT_FOUND', 'Transaction not found');
  const events = repo.readEvents(id);
  const chain = verifyChain(events);
  if (!chain.ok) throw new HttpError(409, 'AUDIT_INVALID', 'The audit chain must verify before drafting');
  const opened = events.find((e) => e.type === 'OPEN_DISPUTE')?.payload.disputeType;
  return { tx, evidence: repo.loadEvidence(id), decisions: repo.loadDecisions(id), headHash: chain.head,
    ...(typeof opened === 'string' ? { disputeType: opened } : {}) };
}

/** Who may ask for which draft, and when it makes sense. */
function checkEligible(feature: DraftFeature, role: string, ctx: DraftContext): void {
  if (feature === 'paypal-message') {
    const open = getApiContext().repo.listPayPalDisputes(ctx.tx.id).some((c) => c.status !== 'RESOLVED');
    if (!open) throw new HttpError(409, 'INVALID_STATE', 'A message draft needs an open PayPal case for this deal');
    return;
  }
  if (role !== 'seller') throw new HttpError(403, 'ROLE_FORBIDDEN', 'Only the seller prepares a courier claim');
  if (ctx.disputeType !== 'damaged') throw new HttpError(409, 'INVALID_STATE', 'A courier claim is for a dispute where the item arrived damaged');
}

export function createDraft(request: Request, id: string) {
  return route(async () => {
    const role = requireRole(request, ['seller', 'reviewer']);
    const body = await jsonBody(request);
    noExtraFields(body, ['feature']);
    const feature = body.feature;
    if (feature !== 'paypal-message' && feature !== 'courier-claim') throw new HttpError(400, 'INVALID_INPUT', 'feature must be paypal-message or courier-claim');
    const ctx = loadContext(id);
    checkEligible(feature, role, ctx);
    const context = getApiContext();
    const result = feature === 'paypal-message' ? await draftFor('paypal-message', ctx) : await draftFor('courier-claim', ctx);
    if (!result.output) {
      return json({ draft: null, unavailable: result.meta.unavailable, message: 'AI draft unavailable. Write the text yourself.' });
    }
    const stored = saveDraft(context.db, id, feature, result.output, result.meta, context.now());
    context.repo.appendAuditEvent({ txId: id, ts: context.now(), actor: role, type: 'AI_DRAFT_CREATED',
      payload: { draftId: stored.id, feature, mode: result.meta.mode, model: result.meta.model, promptVersion: result.meta.promptVersion,
        promptHash: result.meta.promptHash, outputHash: result.meta.outputHash, inputContainsInjection: result.inputContainsInjection } });
    return json({ draftId: stored.id, draft: result.output, mode: result.meta.mode, inputContainsInjection: result.inputContainsInjection });
  });
}

/** Builds the courier claim pack PDF from the seller-approved text; nothing is sent to a courier. */
export function courierClaimPack(request: Request, id: string) {
  return route(async () => {
    const role = requireRole(request, ['seller']);
    const body = await jsonBody(request);
    noExtraFields(body, ['subject', 'body', 'draftId']);
    const subject = stringField(body, 'subject', 120);
    const text = stringField(body, 'body', COURIER_BODY_MAX);
    const ctx = loadContext(id);
    checkEligible('courier-claim', role, ctx);
    const context = getApiContext();
    const draftId = body.draftId === undefined ? undefined : stringField(body, 'draftId', 64);
    const draft = draftId ? loadDraft<CourierClaimDraft>(context.db, draftId, id, 'courier-claim') : null;
    if (draftId && !draft) throw new HttpError(404, 'NOT_FOUND', 'Draft not found for this deal');

    const aliases = evidenceAliases(ctx.evidence);
    const lines = [
      'Courier damage claim - prepared with Creident (Sandbox demo, not sent to any courier)',
      `Subject: ${subject}`, `Item: ${ctx.tx.item}`, `Declared value: ${ctx.tx.amount} ${ctx.tx.currency}`,
      `Tracking: ${ctx.tx.trackingNumber ?? 'Not recorded'}`, '',
      ...text.split('\n'), '',
      ...(draft ? ['Timeline (each entry cites recorded evidence):', ...draft.output.timeline.map((t) => `- ${t.when}: ${t.event} [${t.evidence.join(', ')}]`), ''] : []),
      'Recorded evidence (SHA-256 of the original text):',
      ...[...aliases].map(([alias, e]) => `${alias} | ${e.submittedBy} | ${e.kind} | sha256 ${sha256(e.content)}`),
      '', `Terms hash: ${ctx.tx.termsHash}`, `Audit head: ${ctx.headHash}`,
      ...(draft ? ['Text drafted by AI and approved by the seller.'] : []),
    ];
    const file = textPdf(lines, true);
    const unchanged = !!draft && subject === draft.output.subject && text === draft.output.body;
    context.repo.appendAuditEvent({ txId: id, ts: context.now(), actor: role, type: 'COURIER_CLAIM_PACK_CREATED',
      payload: { pdfHash: sha256(file), termsHash: ctx.tx.termsHash, headHash: ctx.headHash,
        ...(draft ? draftAudit(draft, unchanged) : { noteSource: 'typed' }) } });
    return new Response(new Blob([new Uint8Array(file)], { type: 'application/pdf' }), { headers: {
      'content-type': 'application/pdf', 'cache-control': 'no-store',
      'content-disposition': `attachment; filename="courier-claim-${id.slice(0, 8)}.pdf"`,
    } });
  });
}
