import { describe, expect, it } from 'vitest';
import { counterfactualVariants, evaluateCases, renderReport, validateCases, type EvaluationCase } from './harness';
import data from './cases/shipping.json';

function cases(): EvaluationCase[] {
  const copy: unknown = structuredClone(data);
  validateCases(copy);
  return copy;
}
const expectedActual = [
  'VOID', 'ESCALATE_HUMAN', 'ESCALATE_HUMAN', 'WAIT', 'REFUND', 'WAIT',
  'RELEASE', 'RELEASE', 'RELEASE', 'WAIT', 'WAIT', 'WAIT',
];

describe('shipping and return evaluation cases', () => {
  it('adds balanced, explicitly draft synthetic cases whose facts survive counterfactuals', () => {
    const added = cases();
    expect(added).toHaveLength(12);
    expect(added.filter(c => c.rightfulSide === 'buyer')).toHaveLength(5);
    expect(added.filter(c => c.rightfulSide === 'seller')).toHaveLength(5);
    expect(added.filter(c => c.rightfulSide === 'unclear')).toHaveLength(2);
    for (const c of added) {
      expect(c.labelStatus).toBe('draft, needs owner review');
      expect(c.rationale).toBeTruthy(); expect(c.rationale).not.toContain('\n');
      expect(c.buyerName).toBe('Alice Example'); expect(c.sellerName).toBe('Bob Example');
      for (const variant of counterfactualVariants(c)) expect(variant.case.facts).toEqual(c.facts);
    }
  });

  it('exercises R1-R3 and real return transitions without any recorded AI summary', async () => {
    const results = await evaluateCases(cases(), {}, { mode: 'replay', k: 3 });
    expect(results.map(r => r.actual)).toEqual(expectedActual);
    for (const r of results) {
      expect(r.variantActions).toEqual(Array(6).fill(r.actual));
      expect(r.repeatActions).toEqual(Array(2).fill(r.actual));
    }
    expect(results.filter(r => r.actual !== r.expected).map(r => r.id)).toEqual([
      'shipping_unknown_destination_unclear', 'return_wrong_destination_unclear',
    ]);
    const report = renderReport(results, 'replay', 3);
    expect(report).toContain('**12** are still drafts');
    expect(report).toContain('false-refund counts REFUND only, not VOID');
    expect(report).toContain('they do not measure a live AI model');
  });

  it('does not let even a one-sided AI summary override shipping/return facts', async () => {
    const results = await evaluateCases(cases(), {}, {
      mode: 'live', k: 1,
      provider: { complete: async () => JSON.stringify({ findings: [{ criterion: data[0]!.criteria[0], supports: 'seller', evidenceIds: ['seller-note'] }], missingEvidence: false }) },
    });
    expect(results.map(r => r.actual)).toEqual(expectedActual);
  });

  it('projects return deadline boundaries, uncaptured refunds and refused returns faithfully', async () => {
    const base = cases().find(c => c.id === 'return_delivered_buyer')!;
    const snapshots = [
      { now: '2026-10-23T12:00:00.000Z', captured: true, destinationMatches: true, expected: 'REFUND' },
      { now: '2026-10-23T12:00:00.000Z', captured: false, destinationMatches: true, expected: 'VOID' },
      { now: '2026-10-23T12:00:00.001Z', captured: false, destinationMatches: true, expected: 'RELEASE' },
      { now: '2026-10-23T11:00:00.000Z', captured: true, destinationMatches: false, expected: 'WAIT' },
      { now: '2026-10-23T11:00:00.000Z', captured: true, destinationMatches: null, expected: 'WAIT' },
    ];
    for (const snapshot of snapshots) {
      const c = structuredClone(base);
      Object.assign(c.facts!.returnFlow!, snapshot);
      delete (c.facts!.returnFlow as unknown as Record<string, unknown>).expected;
      const result = await evaluateCases([c], {}, { mode: 'replay', k: 1 });
      expect(result[0]?.actual).toBe(snapshot.expected);
    }
  });

  it.each([
    { phase: 'RETURN_REQUESTED' }, { hasTracking: 'true' }, { destinationMatches: 'unknown' },
    { unrecognized: true }, { returnFlow: { captured: true } },
    { returnFlow: { captured: true, now: 'invalid-date', returnBy: '2026-10-23T12:00:00Z', trackingDelivered: true, destinationMatches: true } },
  ])('rejects malformed facts instead of silently inventing a shipping outcome: %j', facts => {
    expect(() => validateCases([{ ...data[0], facts }])).toThrow('Invalid evaluation case');
  });
});
