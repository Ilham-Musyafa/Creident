import { describe, expect, it } from 'vitest';
import { applyLabelReview } from './labelReview.ts';
import type { EvaluationCase } from './harness.ts';

const base = (id: string, extra: Partial<EvaluationCase> = {}): EvaluationCase => ({
  id, scenario: 's', rightfulSide: 'buyer', expected: 'REFUND', labelStatus: 'draft, needs owner review',
  rationale: 'Draft reason.', criteria: ['c'], buyerName: 'A', sellerName: 'B',
  evidence: [{ id: 'e', submittedBy: 'buyer', kind: 'note', content: 'x' }], ...extra,
});

describe('label review', () => {
  it('marks agreed cases reviewed and replaces changed labels', () => {
    const out = applyLabelReview([base('a'), base('b'), base('c')], {
      a: { decision: 'agree' }, b: { decision: 'human', note: 'Courier fault, not seller' }, zzz: { decision: 'agree' },
    });
    expect(out.agreed).toEqual(['a']);
    expect(out.changed).toEqual(['b']);
    expect(out.unknown).toEqual(['zzz']);
    expect(out.cases[0]).toMatchObject({ labelStatus: 'reviewed by owner', expected: 'REFUND' });
    expect(out.cases[1]).toMatchObject({ labelStatus: 'reviewed by owner', rightfulSide: 'unclear', expected: 'ESCALATE_HUMAN' });
    expect(out.cases[1]!.rationale).toContain('Courier fault, not seller');
    expect(out.cases[2]!.labelStatus).toBe('draft, needs owner review');
  });

  it('keeps injection cases escalated to a human', () => {
    const out = applyLabelReview([base('injection_x', { expected: 'ESCALATE_HUMAN' })], { injection_x: { decision: 'seller' } });
    expect(out.cases[0]).toMatchObject({ rightfulSide: 'seller', expected: 'ESCALATE_HUMAN' });
  });
});
