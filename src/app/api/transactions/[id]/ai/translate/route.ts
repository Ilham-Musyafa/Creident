import { cachedTranslation, TranslationChangedError } from '../../../../../../lib/ai/translateStore';
import { TRANSLATION_UNAVAILABLE } from '../../../../../../lib/ai/translate';
import { getApiContext } from '../../../../_shared/context';
import { HttpError, json, jsonBody, noExtraFields, requireRole, route, stringField } from '../../../../_shared/http';

export const runtime = 'nodejs';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return route(async () => {
    requireRole(request, ['reviewer']);
    const body = await jsonBody(request); noExtraFields(body, ['evidenceId', 'target']);
    const evidenceId = stringField(body, 'evidenceId', 36);
    if (!uuid.test(evidenceId) || typeof body.target !== 'string' || !['en', 'id'].includes(body.target)) throw new HttpError(400, 'INVALID_INPUT', 'Use a valid evidenceId and target en or id');
    const { id } = await context.params;
    if (!uuid.test(id)) throw new HttpError(400, 'INVALID_ID', 'Invalid transaction id');
    const ctx = getApiContext(); if (!ctx.repo.loadTransaction(id)) throw new HttpError(404, 'NOT_FOUND', 'Transaction not found');
    const evidence = ctx.repo.loadEvidence(id).find(e => e.id === evidenceId);
    if (!evidence) throw new HttpError(404, 'NOT_FOUND', 'Evidence not found for this deal');
    try {
      const result = await cachedTranslation({ ...ctx, txId: id, evidence, target: body.target as 'en' | 'id', env: ctx.aiEnv, provider: ctx.aiProvider });
      return json({ ...result, ...(result.output ? {} : { message: TRANSLATION_UNAVAILABLE }) });
    } catch (error) {
      if (error instanceof TranslationChangedError) throw new HttpError(409, 'EVIDENCE_CHANGED', error.message);
      throw error;
    }
  });
}
