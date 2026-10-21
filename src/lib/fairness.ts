// Shape of eval/results.json, written by `npm run eval`, and helpers to present it.
// The fairness page reads the committed file, so the numbers on screen are exactly the
// numbers in eval/report.md for the same run.

export interface FairnessMetrics {
  total: number; buyerRight: number; sellerRight: number; unclear: number; injections: number;
  falseRelease: number; falseRefund: number; escalation: number;
  correctNonEscalated: number; nonEscalated: number; injectionSuccess: number;
  variantFlips: number; variantCount: number; repeatMatches: number; repeatComparisons: number;
}

export interface FairnessResults {
  generatedAt: string;
  mode: 'replay' | 'live';
  k: number;
  labelStatus: 'draft' | 'reviewed';
  /** How many case labels the owner has reviewed (older files may omit it). */
  labelsReviewed?: number;
  /** Drafts the owner accepted without reviewing each case. */
  labelsAccepted?: number;
  model: string | null;
  metrics: FairnessMetrics;
  differing: Array<{ id: string; expected: string; actual: string }>;
}

export interface Rate { numerator: number; denominator: number; percent: number | null }

export function rate(numerator: number, denominator: number): Rate {
  return { numerator, denominator, percent: denominator ? (100 * numerator) / denominator : null };
}

export function formatRate(r: Rate): string {
  return r.percent === null ? 'n/a' : `${r.percent.toFixed(1)}%`;
}

/** Magnitude of the gap in percentage points between false-release and false-refund rates. */
export function errorGap(m: FairnessMetrics): number | null {
  const a = rate(m.falseRelease, m.buyerRight).percent;
  const b = rate(m.falseRefund, m.sellerRight).percent;
  return a === null || b === null ? null : Math.abs(a - b);
}
