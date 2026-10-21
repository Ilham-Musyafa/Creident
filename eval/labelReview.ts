// Apply the owner's label review to the evaluation cases. A review entry either agrees with the
// draft label or replaces it; either way the case becomes "reviewed by owner". The review file
// is plain data: { "<caseId>": { "decision": "agree" | "buyer" | "seller" | "human", "note"?: string } }.

import type { EvaluationCase, ExpectedLabel, RightfulSide } from './harness.ts';

export type ReviewDecision = 'agree' | 'buyer' | 'seller' | 'human';
export interface ReviewEntry { decision: ReviewDecision; note?: string }

const LABEL: Record<Exclude<ReviewDecision, 'agree'>, { rightfulSide: RightfulSide; expected: ExpectedLabel }> = {
  buyer: { rightfulSide: 'buyer', expected: 'REFUND' },
  seller: { rightfulSide: 'seller', expected: 'RELEASE' },
  human: { rightfulSide: 'unclear', expected: 'ESCALATE_HUMAN' },
};

const isInjection = (c: EvaluationCase) => c.id.startsWith('injection_');

/** Mark every case that is still a draft as accepted by the owner without individual review. */
export function acceptRemainingDrafts(cases: EvaluationCase[]): EvaluationCase[] {
  return cases.map((c) => c.labelStatus === 'draft, needs owner review' ? { ...c, labelStatus: 'draft accepted by owner' as const } : c);
}

export function applyLabelReview(cases: EvaluationCase[], review: Record<string, ReviewEntry>): { cases: EvaluationCase[]; changed: string[]; agreed: string[]; unknown: string[] } {
  const ids = new Set(cases.map((c) => c.id));
  const unknown = Object.keys(review).filter((id) => !ids.has(id));
  const changed: string[] = [];
  const agreed: string[] = [];
  const next = cases.map((c) => {
    const entry = review[c.id];
    if (!entry?.decision) return c;
    if (!['agree', 'buyer', 'seller', 'human'].includes(entry.decision)) throw new Error(`Unknown decision for ${c.id}`);
    const note = entry.note?.trim() ? ` Owner note: ${entry.note.trim()}` : '';
    if (entry.decision === 'agree') {
      agreed.push(c.id);
      return { ...c, labelStatus: 'reviewed by owner' as const, rationale: c.rationale + note };
    }
    changed.push(c.id);
    const label = LABEL[entry.decision];
    // "human" changes only what the system should do; who is right stays as labelled, so the
    // false-release and false-refund rates still count the case. Injection cases always escalate.
    return {
      ...c, labelStatus: 'reviewed by owner' as const,
      rightfulSide: entry.decision === 'human' ? c.rightfulSide : label.rightfulSide,
      expected: isInjection(c) ? 'ESCALATE_HUMAN' as const : label.expected,
      rationale: `${c.rationale} Owner changed the label to ${entry.decision}.${note}`,
    };
  });
  return { cases: next, changed, agreed, unknown };
}
