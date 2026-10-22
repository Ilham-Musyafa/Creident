import { canonicalJson } from '../../../../../../lib/audit/chain';
import { draftCopilot, copilotData, COPILOT_UNAVAILABLE } from '../../../../../../lib/ai/copilot';
import { saveCopilot } from '../../../../../../lib/ai/copilotStore';
import { decisionBasis } from '../../../../../../lib/decisionBasis';
import { getApiContext } from '../../../../_shared/context';
import { HttpError, json, jsonBody, noExtraFields, requireRole, route } from '../../../../_shared/http';

export const runtime = 'nodejs';
export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return route(async () => {
    requireRole(request, ['reviewer']);
    const body = await jsonBody(request); noExtraFields(body, []);
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new HttpError(400, 'INVALID_ID', 'Invalid transaction id');
    const ctx = getApiContext(); const tx = ctx.repo.loadTransaction(id);
    if (!tx) throw new HttpError(404, 'NOT_FOUND', 'Transaction not found');
    if (tx.status !== 'UNDER_REVIEW') throw new HttpError(409, 'INVALID_STATE', 'Copilot requires human review');
    const recommendation = ctx.repo.loadRecommendation(id);
    if (!recommendation) throw new HttpError(409, 'RECOMMENDATION_REQUIRED', 'Wait for the rules recommendation before requesting a draft');
    const evidence = ctx.repo.loadEvidence(id); const basis = decisionBasis(tx.termsJson, evidence);
    const input = { tx, evidence, recommendation, disputeType: ctx.repo.readEvents(id).find(e => e.type === 'OPEN_DISPUTE')?.payload.disputeType as string | undefined };
    const result = await draftCopilot(input, { env: ctx.aiEnv, provider: ctx.aiProvider });
    const current = ctx.repo.loadTransaction(id);
    if (!current || current.status !== 'UNDER_REVIEW' || canonicalJson(basis) !== canonicalJson(decisionBasis(current.termsJson, ctx.repo.loadEvidence(id)))) {
      throw new HttpError(409, 'COPILOT_STALE', 'Deal changed during drafting. Generate a new draft or write the reason manually.');
    }
    const saved = result.output ? saveCopilot(ctx.db, id, result.output, result.meta, basis, ctx.now()) : null;
    ctx.repo.appendAuditEvent({ txId: id, ts: ctx.now(), actor: 'reviewer', type: 'AI_DRAFT_CREATED',
      payload: { ...result.meta, ...(saved ? { draftId: saved.id } : {}), inputContainsInjection: result.inputContainsInjection,
        ...(JSON.parse(tx.termsJson).demo === true ? { simulated: true } : {}) } });
    const data = copilotData(input);
    return json({ draft: result.output, draftId: saved?.id ?? null, meta: result.meta, inputContainsInjection: result.inputContainsInjection,
      criteria: data.criteria, evidence: data.evidence.map(e => ({ alias: e.alias, kind: e.kind })),
      ...(result.output ? {} : { message: COPILOT_UNAVAILABLE }) });
  });
}
