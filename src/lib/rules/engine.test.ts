import { describe, expect, it } from 'vitest';
import { decide } from './engine';
import type { AiSummary, RuleInput } from './engine';

const base: RuleInput = {
  phase: 'INSPECTION',
  externalDisputeOpen: false,
  evidenceContainsInjection: false,
  shipByPassed: false,
  hasTracking: true,
  trackingDelivered: true,
  destinationMatches: true,
  shipDateConsistent: true,
  buyerConfirmed: false,
  inspectionExpired: false,
  disputeOpen: false,
  buyerEvidenceCount: 0,
  sellerEvidenceCount: 0,
  ai: null,
};

const ai = (...supports: Array<'buyer' | 'seller' | 'unclear'>): AiSummary => ({
  missingEvidence: false,
  findings: supports.map((s, i) => ({ criterion: `c${i}`, supports: s, evidenceIds: [`e${i}`] })),
});

const dispute = (extra: Partial<RuleInput> = {}): RuleInput => ({
  ...base,
  phase: 'DISPUTE',
  disputeOpen: true,
  buyerEvidenceCount: 2,
  sellerEvidenceCount: 2,
  ...extra,
});

describe('priority rules', () => {
  it('R6 freezes on an external PayPal dispute before anything else', () => {
    expect(decide({ ...dispute({ ai: ai('buyer') }), externalDisputeOpen: true, evidenceContainsInjection: true }))
      .toMatchObject({ rule: 'R6', action: 'FREEZE' });
  });

  it('R7 escalates suspected prompt injection even when the AI is confident', () => {
    expect(decide(dispute({ ai: ai('seller', 'seller'), evidenceContainsInjection: true })))
      .toMatchObject({ rule: 'R7', action: 'ESCALATE_HUMAN', requiresHuman: true });
  });
});

describe('shipment', () => {
  it('R1 voids when no tracking arrives before the deadline', () => {
    expect(decide({ ...base, phase: 'AWAITING_SHIPMENT', hasTracking: false, shipByPassed: true }))
      .toMatchObject({ rule: 'R1', action: 'VOID', requiresHuman: false });
  });

  it('waits before the deadline', () => {
    expect(decide({ ...base, phase: 'AWAITING_SHIPMENT', hasTracking: false })).toMatchObject({ rule: 'NONE', action: 'WAIT' });
  });

  it('R3 escalates tracking to the wrong destination', () => {
    expect(decide({ ...base, phase: 'SHIPPED', destinationMatches: false })).toMatchObject({ rule: 'R3', action: 'ESCALATE_HUMAN' });
  });

  it('R3 escalates a ship date inconsistent with the order', () => {
    expect(decide({ ...base, shipDateConsistent: false })).toMatchObject({ rule: 'R3' });
  });
});

describe('inspection', () => {
  it('R2 releases when the buyer confirms', () => {
    expect(decide({ ...base, buyerConfirmed: true })).toMatchObject({ rule: 'R2', action: 'RELEASE', requiresHuman: false });
  });

  it('R2 releases when the window ends silently and delivery matches', () => {
    expect(decide({ ...base, inspectionExpired: true })).toMatchObject({ rule: 'R2', action: 'RELEASE' });
  });

  it('does not release on silence when the destination is unknown', () => {
    expect(decide({ ...base, inspectionExpired: true, destinationMatches: null })).toMatchObject({ action: 'WAIT' });
  });
});

describe('disputes', () => {
  it('R5 escalates when one side has no evidence', () => {
    expect(decide(dispute({ sellerEvidenceCount: 0, ai: ai('buyer') }))).toMatchObject({ rule: 'R5' });
  });

  it('R5 escalates without an AI summary', () => {
    expect(decide(dispute())).toMatchObject({ rule: 'R5' });
  });

  it('R5 escalates unclear or mixed findings', () => {
    expect(decide(dispute({ ai: ai('buyer', 'unclear') }))).toMatchObject({ rule: 'R5' });
    expect(decide(dispute({ ai: ai('buyer', 'seller') }))).toMatchObject({ rule: 'R5' });
  });

  it('R5 escalates findings that cite no evidence', () => {
    const summary: AiSummary = { missingEvidence: false, findings: [{ criterion: 'c', supports: 'buyer', evidenceIds: [] }] };
    expect(decide(dispute({ ai: summary }))).toMatchObject({ rule: 'R5' });
  });

  it('R4 recommends a refund when every criterion supports the buyer, still requiring a human', () => {
    expect(decide(dispute({ ai: ai('buyer', 'buyer') }))).toMatchObject({ rule: 'R4', action: 'REFUND', requiresHuman: true });
  });

  it('R4 recommends release when every criterion supports the seller', () => {
    expect(decide(dispute({ ai: ai('seller') }))).toMatchObject({ rule: 'R4', action: 'RELEASE', requiresHuman: true });
  });
});

it('always explains itself', () => {
  for (const input of [base, dispute(), dispute({ ai: ai('buyer') }), { ...base, externalDisputeOpen: true }]) {
    expect(decide(input).reasons.length).toBeGreaterThan(0);
  }
});

describe('R5 by dispute type (owner decision 2026-10-21)', () => {
  it('sends damage and missing-parts disputes to a person even when the summary is one-sided', () => {
    expect(decide(dispute({ ai: ai('buyer', 'buyer'), disputeType: 'damaged' })))
      .toMatchObject({ rule: 'R5', action: 'ESCALATE_HUMAN', requiresHuman: true });
    expect(decide(dispute({ ai: ai('seller'), disputeType: 'incomplete' })))
      .toMatchObject({ rule: 'R5', action: 'ESCALATE_HUMAN' });
  });
  it('leaves other dispute types to R4', () => {
    expect(decide(dispute({ ai: ai('buyer'), disputeType: 'not_as_described' }))).toMatchObject({ rule: 'R4', action: 'REFUND' });
    expect(decide(dispute({ ai: ai('seller'), disputeType: 'not_received' }))).toMatchObject({ rule: 'R4', action: 'RELEASE' });
  });
  it('keeps injection (R7) ahead of the dispute type', () => {
    expect(decide(dispute({ ai: ai('buyer'), disputeType: 'damaged', evidenceContainsInjection: true }))).toMatchObject({ rule: 'R7' });
  });
});
