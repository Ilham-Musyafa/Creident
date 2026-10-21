import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { canonicalJson } from '../audit/chain';
import type { AssistResult } from './assist';
import { descriptionForDraft, TERMS_PROMPT_VERSION, TERMS_SYSTEM, validateTermsDraft, type TermsDraft } from './terms';

// Ephemeral process key, shared across route bundles; never persisted or logged.
// A restart invalidates receipts, so the seller can generate again or continue manually.
const runtime = globalThis as typeof globalThis & { __halcyvaultTermsReceiptKey?: Uint8Array };
const key = () => runtime.__halcyvaultTermsReceiptKey ??= randomBytes(32);
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const sign = (body: string) => createHmac('sha256', key()).update(body).digest('hex');
export const TERMS_RECEIPT_TTL_MS = 2 * 60 * 60 * 1000;

export function issueTermsReceipt(result: AssistResult<TermsDraft>, now = Date.now()): string {
  if (!result.output) throw new Error('A valid draft is required');
  const body = Buffer.from(JSON.stringify({ draft: result.output, meta: result.meta,
    inputContainsInjection: result.inputContainsInjection, expiresAt: now + TERMS_RECEIPT_TTL_MS })).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function acceptedTermsAudit(receipt: unknown, item: string, terms: Record<string, unknown>, now = Date.now()) {
  if (typeof receipt !== 'string' || receipt.length > 8192) return null;
  const parts = receipt.split('.');
  if (parts.length !== 2 || !/^[a-zA-Z\d_-]+$/.test(parts[0]!) || !/^[a-f\d]{64}$/.test(parts[1]!)) return null;
  if (!timingSafeEqual(Buffer.from(parts[1]!, 'hex'), Buffer.from(sign(parts[0]!), 'hex'))) return null;
  try {
    const source = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString('utf8'));
    const draft = validateTermsDraft(source.draft);
    const meta = source.meta;
    if (!draft || !Number.isFinite(source.expiresAt) || source.expiresAt <= now ||
        meta?.feature !== 'terms' || !['replay', 'live'].includes(meta.mode) || meta.promptVersion !== TERMS_PROMPT_VERSION ||
        meta.promptHash !== sha(`${TERMS_PROMPT_VERSION}\n${TERMS_SYSTEM}`) || meta.outputHash !== sha(canonicalJson(draft))) return null;
    const originalTerms = { condition: draft.condition, description: descriptionForDraft(draft),
      includedItems: draft.includedItems, criteria: draft.criteria };
    const unchanged = item === draft.item && canonicalJson(terms) === canonicalJson(originalTerms);
    return { feature: 'terms', mode: meta.mode as 'live' | 'replay', model: meta.model as string | null,
      promptVersion: meta.promptVersion as string, promptHash: meta.promptHash as string, outputHash: meta.outputHash as string,
      accepted: unchanged ? 'unchanged' as const : 'edited' as const, inputContainsInjection: source.inputContainsInjection === true };
  } catch { return null; }
}
