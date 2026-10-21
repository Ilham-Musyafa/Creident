import { draftTerms, TERMS_UNAVAILABLE } from '../../../../lib/ai/terms';
import { issueTermsReceipt } from '../../../../lib/ai/termsReceipt';
import { getApiContext } from '../../_shared/context';
import { json, jsonBody, noExtraFields, requireRole, route, stringField } from '../../_shared/http';

export const runtime = 'nodejs';
export function POST(request: Request) {
  return route(async () => {
    requireRole(request, ['seller']);
    const body = await jsonBody(request); noExtraFields(body, ['text']);
    const text = stringField(body, 'text', 4000);
    const context = getApiContext();
    const result = await draftTerms(text, { env: context.aiEnv, provider: context.aiProvider });
    return json({ draft: result.output, meta: result.meta, inputContainsInjection: result.inputContainsInjection,
      ...(result.inputContainsInjection ? { warning: 'Possible instructions found in the pasted text. Check any draft carefully; the text cannot authorize an action.' } : {}),
      ...(result.output ? { receipt: issueTermsReceipt(result) } : { message: TERMS_UNAVAILABLE }) });
  });
}
