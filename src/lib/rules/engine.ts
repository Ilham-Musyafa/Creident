// Deterministic dispute rules (docs/DESIGN.md section 5).
// The AI never decides: it only produces `ai` (a structured summary of the evidence), and these
// rules turn facts plus that summary into an action. Every result says which rule fired and why.

export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7';
export type RuleAction = 'RELEASE' | 'REFUND' | 'VOID' | 'ESCALATE_HUMAN' | 'FREEZE' | 'WAIT';

export type Side = 'buyer' | 'seller';

export interface AiFinding {
  criterion: string;
  supports: Side | 'unclear';
  evidenceIds: string[];
}

/** Output of the AI evidence step. Only this shape is read by the rules, never free text. */
export interface AiSummary {
  findings: AiFinding[];
  missingEvidence: boolean;
}

export interface RuleInput {
  phase: 'AWAITING_SHIPMENT' | 'SHIPPED' | 'INSPECTION' | 'DISPUTE';
  externalDisputeOpen: boolean;
  /** Set when evidence text looks like instructions aimed at the AI (prompt injection). */
  evidenceContainsInjection: boolean;
  shipByPassed: boolean;
  hasTracking: boolean;
  trackingDelivered: boolean;
  /** null = unknown (no destination data yet). */
  destinationMatches: boolean | null;
  shipDateConsistent: boolean;
  buyerConfirmed: boolean;
  inspectionExpired: boolean;
  disputeOpen: boolean;
  buyerEvidenceCount: number;
  sellerEvidenceCount: number;
  /** Why the buyer disputed (src/lib/disputeTypes.ts), if they said. */
  disputeType?: string;
  ai: AiSummary | null;
}

/** Dispute types a person always decides: the amount (full or partial) and the cause (seller or courier) need judgement. */
export const HUMAN_DISPUTE_TYPES: Record<string, string> = {
  damaged: 'The buyer reported the item arrived damaged',
  incomplete: 'The buyer reported parts or accessories missing',
};

export interface RuleDecision {
  rule: RuleId | 'NONE';
  action: RuleAction;
  /** In the demo every money-moving recommendation from a dispute needs a human confirmation. */
  requiresHuman: boolean;
  reasons: string[];
}

const decision = (rule: RuleDecision['rule'], action: RuleAction, requiresHuman: boolean, ...reasons: string[]): RuleDecision => ({
  rule,
  action,
  requiresHuman,
  reasons,
});

/** Rules are checked in a fixed priority order; the first one that applies wins. */
export function decide(input: RuleInput): RuleDecision {
  // R6: PayPal's own dispute process overrides ours. Nothing moves until it is resolved.
  if (input.externalDisputeOpen) {
    return decision('R6', 'FREEZE', false, 'A PayPal dispute or reversal is open');
  }

  // R7: suspected prompt injection. The text is ignored for scoring and a human looks at it.
  if (input.evidenceContainsInjection) {
    return decision('R7', 'ESCALATE_HUMAN', true, 'Evidence contains text that looks like instructions to the AI');
  }

  if (input.phase === 'AWAITING_SHIPMENT') {
    // R1: no tracking by the deadline. Funds were only authorized, so voiding moves no money.
    if (!input.hasTracking && input.shipByPassed) {
      return decision('R1', 'VOID', false, 'No tracking was submitted before the ship-by deadline');
    }
    return decision('NONE', 'WAIT', false, 'Waiting for shipment');
  }

  // R3: tracking that does not fit the order (another destination, or shipped before the order).
  if (input.hasTracking && (input.destinationMatches === false || !input.shipDateConsistent)) {
    const reasons: string[] = [];
    if (input.destinationMatches === false) reasons.push('Tracking destination does not match the agreed address');
    if (!input.shipDateConsistent) reasons.push('Tracking ship date is inconsistent with the order');
    return decision('R3', 'ESCALATE_HUMAN', true, ...reasons);
  }

  if (input.phase === 'SHIPPED') {
    return decision('NONE', 'WAIT', false, 'Waiting for delivery');
  }

  if (input.phase === 'INSPECTION') {
    // R2: delivered to the right place and the buyer confirmed or stayed silent through the window.
    const deliveredOk = input.trackingDelivered && input.destinationMatches === true;
    if (!input.disputeOpen && deliveredOk && (input.buyerConfirmed || input.inspectionExpired)) {
      return decision(
        'R2',
        'RELEASE',
        false,
        input.buyerConfirmed ? 'Buyer confirmed receipt' : 'Inspection window ended without a dispute',
        'Tracking shows delivery to the agreed destination',
      );
    }
    return decision('NONE', 'WAIT', false, 'Inspection window is open');
  }

  // phase === 'DISPUTE'
  return decideDispute(input);
}

function decideDispute(input: RuleInput): RuleDecision {
  if (input.buyerEvidenceCount === 0 || input.sellerEvidenceCount === 0) {
    return decision('R5', 'ESCALATE_HUMAN', true, 'Evidence is missing from one side');
  }
  // Owner decision 2026-10-21: damage and missing parts always go to a person, whatever the summary says.
  if (input.disputeType && HUMAN_DISPUTE_TYPES[input.disputeType]) {
    return decision('R5', 'ESCALATE_HUMAN', true, HUMAN_DISPUTE_TYPES[input.disputeType]!, 'A person decides full or partial refund and whether the seller or the courier caused it');
  }
  const ai = input.ai;
  if (!ai || ai.findings.length === 0) {
    return decision('R5', 'ESCALATE_HUMAN', true, 'No evidence summary is available');
  }
  if (ai.missingEvidence) {
    return decision('R5', 'ESCALATE_HUMAN', true, 'The evidence summary reports missing evidence');
  }
  if (ai.findings.some((f) => f.supports === 'unclear')) {
    return decision('R5', 'ESCALATE_HUMAN', true, 'At least one criterion is unclear');
  }
  if (ai.findings.some((f) => f.evidenceIds.length === 0)) {
    return decision('R5', 'ESCALATE_HUMAN', true, 'A finding is not backed by any evidence item');
  }

  const sides = new Set(ai.findings.map((f) => f.supports));
  if (sides.size > 1) {
    // Mixed results (e.g. partial delivery or damage in transit). A human may also choose a split.
    return decision('R5', 'ESCALATE_HUMAN', true, 'Findings support different sides');
  }

  // R4: every criterion clearly supports one side, each backed by evidence. Still a recommendation.
  const side = [...sides][0] as Side;
  return side === 'buyer'
    ? decision('R4', 'REFUND', true, 'All criteria support the buyer')
    : decision('R4', 'RELEASE', true, 'All criteria support the seller');
}
