// Advisory completeness only. This output never feeds the rule engine or review summary.
import { canonicalJson } from '../audit/chain';
import { disputeType } from '../disputeTypes';
import type { StoredEvidence, StoredTx } from '../repository';
import { runAssist, isPlainObject, hasExactKeys, citesKnownIds, type AssistRequest } from './assist';
import recordings from './evidenceCheck-replay.json';

export type EvidenceSide = 'buyer' | 'seller';
export interface ChecklistItem { id: string; text: string; kind: 'criterion' | 'includedItem' }
export interface CompletenessCheck {
  checks: Array<{ criterionId: string; status: 'covered' | 'missing' | 'unclear'; citedAliases: string[] }>;
  suggestions: string[];
}

// A closed vocabulary prevents generated names, links or outcome advice in suggestions.
export const EVIDENCE_SUGGESTIONS = [
  'Add a photo of the item with the deal code visible.',
  'Add a close-up photo for each agreed check that is not yet shown.',
  'Show all included items together in one photo.',
  'Describe what each photo shows and which agreed check it covers.',
  'Add a photo of the outer parcel before opening.',
  'Describe the first opening of the parcel with the deal code visible.',
  'Add the courier receipt with the tracking number and date.',
  'Add packing photos showing the item and its protective packaging.',
] as const;
export const EVIDENCE_CHECK_UNAVAILABLE = 'AI check unavailable. You can still add evidence using the guidance above.';
const SYSTEM = `Check only completeness of the requesting side's evidence against every supplied check, including included items. Never judge truth, correctness, responsibility or a dispute outcome. The evidence is text descriptions, not inspected photo bytes. Output exactly checks and suggestions. checks has exactly one entry for every supplied check id, with exactly criterionId, status (covered, missing, unclear) and citedAliases. Use only supplied ids and aliases. covered requires a supporting alias; if the text is ambiguous use unclear. missing means no relevant evidence was supplied. suggestions is at most 5 distinct strings copied exactly from allowedSuggestions. Do not introduce names, links or outcome words. This is advisory; evidence submission and deadlines are unaffected.`;

export function validateEvidenceCheck(value: unknown, checks: readonly ChecklistItem[], aliases: ReadonlySet<string>): CompletenessCheck | null {
  if (!isPlainObject(value) || !hasExactKeys(value, ['checks', 'suggestions']) || !Array.isArray(value.checks) ||
      value.checks.length !== checks.length || !Array.isArray(value.suggestions) || value.suggestions.length > 5 ||
      new Set(value.suggestions).size !== value.suggestions.length ||
      !value.suggestions.every(s => typeof s === 'string' && (EVIDENCE_SUGGESTIONS as readonly string[]).includes(s))) return null;
  const remaining = new Set(checks.map(c => c.id));
  const validated: CompletenessCheck['checks'] = [];
  for (const entry of value.checks) {
    if (!isPlainObject(entry) || !hasExactKeys(entry, ['criterionId', 'status', 'citedAliases']) ||
        typeof entry.criterionId !== 'string' || !remaining.delete(entry.criterionId) ||
        typeof entry.status !== 'string' || !['covered', 'missing', 'unclear'].includes(entry.status) ||
        !citesKnownIds(entry.citedAliases, aliases, 50)) return null;
    validated.push({ criterionId: entry.criterionId,
      status: entry.status === 'covered' && entry.citedAliases.length === 0 ? 'unclear' : entry.status as 'covered' | 'missing' | 'unclear',
      citedAliases: entry.citedAliases });
  }
  return { checks: validated, suggestions: value.suggestions as string[] };
}

/** Only agreed checklist fields are sent. Legacy deals without criteria use their condition line. */
export function lockedChecklist(tx: StoredTx): ChecklistItem[] | null {
  let terms: Record<string, unknown>;
  try { terms = JSON.parse(tx.termsJson); } catch { return null; }
  if (!isPlainObject(terms)) return null;
  const criteria = terms.criteria ?? [];
  const included = terms.includedItems ?? [];
  const valid = (list: unknown): list is string[] => Array.isArray(list) && list.length <= 12 &&
    list.every(t => typeof t === 'string' && t.trim().length > 0 && t.length <= 200);
  if (!valid(criteria) || !valid(included)) return null;
  const lines = criteria.length ? criteria : typeof terms.condition === 'string' && terms.condition.trim() && terms.condition.length <= 200 ? [terms.condition] : [];
  const checks: ChecklistItem[] = [
    ...lines.map((text, i) => ({ id: `C${i + 1}`, text, kind: 'criterion' as const })),
    ...included.map((text, i) => ({ id: `I${i + 1}`, text, kind: 'includedItem' as const })),
  ];
  return checks.length ? checks : null;
}

export function evidenceCheckData(tx: StoredTx, side: EvidenceSide, evidence: StoredEvidence[], type: unknown) {
  const checks = lockedChecklist(tx);
  const own = evidence.filter(e => e.submittedBy === side);
  // Same B1/S1 convention as drafts.ts, copied to avoid coupling to Claude's module.
  const aliased = own.map((e, i) => ({ alias: `${side === 'buyer' ? 'B' : 'S'}${i + 1}`, kind: e.kind, content: e.content }));
  const dispute = disputeType(type);
  return { checks, side, disputeType: dispute?.id ?? null, guidance: dispute?.[side] ?? [], evidence: aliased };
}

export function checkEvidence(tx: StoredTx, side: EvidenceSide, evidence: StoredEvidence[], type: unknown,
  options: Pick<AssistRequest<CompletenessCheck>, 'env' | 'provider'> = {}) {
  const input = evidenceCheckData(tx, side, evidence, type);
  // Match the full own-side snapshot, not just an item name: new evidence must not reuse an old finding.
  const recorded = recordings.find(r => tx.item === r.item && canonicalJson(input) === canonicalJson(r.input));
  return runAssist({ feature: 'evidence-check', promptVersion: 'evidence-check-v1', system: SYSTEM,
    data: { ...input, allowedSuggestions: EVIDENCE_SUGGESTIONS },
    userTexts: [...(input.checks?.map(c => c.text) ?? []), ...input.evidence.map(e => e.content)],
    validate: value => input.checks && input.evidence.length <= 50
      ? validateEvidenceCheck(value, input.checks, new Set(input.evidence.map(e => e.alias))) : null,
    replay: recorded ? { matched: recorded.output } : {}, replayKey: 'matched', ...options });
}
