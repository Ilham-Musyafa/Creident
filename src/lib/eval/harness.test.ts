import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { counterfactualVariants, metrics, validateCases, type CaseResult, type EvaluationCase } from '../../../eval/harness.ts';

const disputes: unknown = JSON.parse(readFileSync('eval/cases/disputes.json', 'utf8'));
const injections: unknown = JSON.parse(readFileSync('eval/cases/injections.json', 'utf8'));

describe('evaluation harness', () => {
  it('has 40 synthetic draft disputes balanced by side and 10 injection cases', () => {
    validateCases(disputes);
    validateCases(injections);
    expect(disputes).toHaveLength(40);
    expect(injections).toHaveLength(10);
    expect(disputes.filter((item) => item.rightfulSide === 'buyer')).toHaveLength(18);
    expect(disputes.filter((item) => item.rightfulSide === 'seller')).toHaveLength(18);
    expect(disputes.filter((item) => item.rightfulSide === 'unclear')).toHaveLength(4);
    expect(injections.every((item) => item.expected === 'ESCALATE_HUMAN')).toBe(true);
    expect(new Set([...disputes, ...injections].map((item) => item.id)).size).toBe(50);
  });

  it('generates six presentation variants without changing the source case', () => {
    validateCases(disputes);
    const source = disputes[0] as EvaluationCase;
    const before = JSON.stringify(source);
    const variants = counterfactualVariants(source);
    expect(variants.map((variant) => variant.name)).toEqual([
      'swapped_names', 'swapped_order', 'longer', 'shorter', 'formal', 'informal',
    ]);
    expect(variants[1]?.case.evidence.map((item) => item.id)).toEqual(source.evidence.map((item) => item.id).reverse());
    expect(variants.every((variant) => variant.case.expected === source.expected)).toBe(true);
    expect(JSON.stringify(source)).toBe(before);
  });

  it('counts wrong-side actions, flips, repeat matches, and injection success with explicit denominators', () => {
    const rows: CaseResult[] = [
      { id: 'buyer', expected: 'REFUND', actual: 'RELEASE', rightfulSide: 'buyer', injection: false,
        variantActions: ['REFUND', 'RELEASE'], repeatActions: ['RELEASE', 'REFUND'] },
      { id: 'injection_case', expected: 'ESCALATE_HUMAN', actual: 'REFUND', rightfulSide: 'seller', injection: true,
        variantActions: ['REFUND', 'ESCALATE_HUMAN'], repeatActions: ['REFUND', 'REFUND'] },
    ];
    expect(metrics(rows)).toMatchObject({
      total: 2, buyerRight: 1, sellerRight: 1, falseRelease: 1, falseRefund: 1,
      injectionSuccess: 1, variantFlips: 2, variantCount: 4,
      repeatMatches: 3, repeatComparisons: 4, nonEscalated: 2, correctNonEscalated: 0,
    });
  });
});
