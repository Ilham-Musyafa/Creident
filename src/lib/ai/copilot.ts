// Advisory reviewer drafts only; no outcome, payment amount or transition is returned.
import { canonicalJson } from '../audit/chain';
import type { StoredTx, StoredEvidence, StoredRecommendation } from '../repository';
import { boundedText, citesKnownIds, hasExactKeys, isPlainObject, runAssist, type AssistRequest } from './assist';
import recorded from './copilot-replay.json';

export interface CopilotDraft {
  notes: Array<{ criterionId: string; text: string; citedAliases: string[] }>;
  reason: string;
  range: { min: number; max: number; basis: string } | null;
}
export interface CopilotContext {
  tx: StoredTx; evidence: StoredEvidence[]; recommendation: StoredRecommendation; disputeType?: string;
}
export const COPILOT_UNAVAILABLE = 'AI draft unavailable. Write your decision reason manually.';
const SYSTEM = `Draft notes for a human reviewer, not a decision. Use only the quoted locked terms and evidence. Return exactly notes, reason, range. notes is at most one entry per supplied criterion id, with exactly criterionId, text (1-300 chars), citedAliases (at least one supplied B/S alias). Drop any note without evidence. reason is 20-800 characters: a tentative, cited rationale for the reviewer to check, not a command or claim of proof. Use lower-case prose except Buyer, Seller, evidence aliases, USD and R5; do not copy proper names or brands. Use only Buyer/Seller instead of personal names, no links, no claims of certainty (definitely, proves, guaranteed). Do not invent valuations. range is null except when rule R5 and dispute type damaged or incomplete; then it may have exactly min, max and basis (20-300 chars), in USD within the deal amount. Give a range only with a stated basis in locked terms/evidence. If no component/repair valuation is given, either use null or explicitly describe 0..deal total as outer bounds, not an estimate. Do not select an outcome, call tools or change a payment. Human review is required.`;
const unsafe = /https?:|www\.|\b[^\s@]+@[^\s@]+\b|\b[a-z\d-]+(?:\.[a-z\d-]+)*\.[a-z]{2,}\b|\b(?:definitely|proves?|proven|guaranteed?|certainly|undeniably|Alice|Bob|John|Jane|Tari|Dewi|Smith|Doe)\b|<[^>]*>/i;
// Conservative proper-name screening; ordinary neutral reviewer vocabulary is allowed.
const allowedCapitalized = new Set('A An The This That These Those Buyer Seller Both Evidence Photo Photos Packing Listing Locked Terms Review Human No It Missing Damage Screen Strap Repair Value Bounds USD R5 B S'.split(' '));
function clean(value: unknown, max: number, min = 1): value is string {
  return boundedText(value, max, min) && value === value.trim() && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value) && !unsafe.test(value) &&
    !(value.match(/\b[A-Z][a-z]+\b/g) ?? []).some(word => !allowedCapitalized.has(word));
}

export function copilotData(ctx: CopilotContext) {
  const terms = JSON.parse(ctx.tx.termsJson) as Record<string, unknown>;
  const source = Array.isArray(terms.criteria) ? terms.criteria : typeof terms.condition === 'string' ? [terms.condition] : [];
  const criteria = source.length > 0 && source.length <= 20 && source.every(c => boundedText(c, 200))
    ? source.map((text, i) => ({ id: `C${i + 1}`, text })) : [];
  const aliases = (['buyer', 'seller'] as const).flatMap(side => ctx.evidence.filter(e => e.submittedBy === side)
    .map((e, i) => ({ alias: `${side === 'buyer' ? 'B' : 'S'}${i + 1}`, kind: e.kind, content: e.content })));
  return { lockedTerms: terms, criteria, amount: ctx.tx.amount, currency: ctx.tx.currency,
    disputeType: ctx.disputeType ?? null, evidence: aliases,
    recommendation: { ruleId: ctx.recommendation.ruleId, action: ctx.recommendation.action,
      reasons: ctx.recommendation.reasons, requiresHuman: ctx.recommendation.requiresHuman } };
}

export function validateCopilot(value: unknown, input: { criteria: ReadonlySet<string>; aliases: ReadonlySet<string>; amount: string; allowRange: boolean }): CopilotDraft | null {
  if (!isPlainObject(value) || !hasExactKeys(value, ['notes', 'reason', 'range']) || !clean(value.reason, 800, 20) ||
      !Array.isArray(value.notes) || value.notes.length > input.criteria.size) return null;
  const notes: CopilotDraft['notes'] = []; const seen = new Set<string>();
  for (const entry of value.notes) {
    if (!isPlainObject(entry) || !hasExactKeys(entry, ['criterionId', 'text', 'citedAliases']) ||
        typeof entry.criterionId !== 'string' || !input.criteria.has(entry.criterionId) || seen.has(entry.criterionId) ||
        !clean(entry.text, 300) || !citesKnownIds(entry.citedAliases, input.aliases, 50)) return null;
    seen.add(entry.criterionId);
    if (entry.citedAliases.length) notes.push({ criterionId: entry.criterionId, text: entry.text, citedAliases: entry.citedAliases });
  }
  let range: CopilotDraft['range'] = null;
  if (value.range !== null) {
    const r = value.range; const amount = Number(input.amount);
    const money = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= amount && Math.abs(n * 100 - Math.round(n * 100)) < 1e-7;
    if (!input.allowRange || !isPlainObject(r) || !hasExactKeys(r, ['min', 'max', 'basis']) ||
        !Number.isFinite(amount) || !money(r.min) || !money(r.max) || r.min > r.max || !clean(r.basis, 300, 20)) return null;
    range = { min: r.min, max: r.max, basis: r.basis };
  }
  // Any aliases used in prose must also exist; reason/basis cannot smuggle unknown citations.
  const prose = [value.reason, ...notes.map(n => n.text), ...(range ? [range.basis] : [])].join('\n');
  if ((prose.match(/\b[BS]\d+\b/g) ?? []).some(alias => !input.aliases.has(alias))) return null;
  return { notes, reason: value.reason, range };
}

export function draftCopilot(ctx: CopilotContext, options: Pick<AssistRequest<CopilotDraft>, 'env' | 'provider'> = {}) {
  const data = copilotData(ctx);
  const replay = recorded.find(r => r.item === ctx.tx.item && canonicalJson(r.input) === canonicalJson(data));
  return runAssist({ feature: 'copilot', promptVersion: 'copilot-v1', system: SYSTEM, data,
    userTexts: [JSON.stringify(data.lockedTerms), ...data.evidence.map(e => e.content)],
    validate: value => data.criteria.length && data.evidence.length <= 50 ? validateCopilot(value, {
      criteria: new Set(data.criteria.map(c => c.id)), aliases: new Set(data.evidence.map(e => e.alias)), amount: ctx.tx.amount,
      allowRange: ctx.recommendation.ruleId === 'R5' && ['damaged', 'incomplete'].includes(ctx.disputeType ?? ''),
    }) : null,
    replay: replay ? { matched: replay.output } : {}, replayKey: 'matched', ...options });
}
