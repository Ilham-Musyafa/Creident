import { describe, expect, it } from 'vitest';
import { errorGap, formatRate, rate, type FairnessMetrics } from './fairness';
import results from '../../eval/results.json';

const base: FairnessMetrics = {
  total: 10, buyerRight: 4, sellerRight: 5, unclear: 1, injections: 0, falseRelease: 1, falseRefund: 0,
  escalation: 2, correctNonEscalated: 7, nonEscalated: 8, injectionSuccess: 0,
  variantFlips: 3, variantCount: 60, repeatMatches: 20, repeatComparisons: 20,
};

describe('fairness helpers', () => {
  it('formats rates and guards empty denominators', () => {
    expect(formatRate(rate(1, 4))).toBe('25.0%');
    expect(formatRate(rate(0, 0))).toBe('n/a');
  });
  it('computes the gap between false-release and false-refund rates', () => {
    expect(errorGap(base)).toBe(25);
    expect(errorGap({ ...base, sellerRight: 0 })).toBeNull();
  });
  it('the committed results file matches the expected shape', () => {
    expect(['replay', 'live']).toContain(results.mode);
    expect(results.metrics.total).toBeGreaterThan(0);
    expect(results.metrics.buyerRight + results.metrics.sellerRight + results.metrics.unclear).toBe(results.metrics.total);
  });
});
