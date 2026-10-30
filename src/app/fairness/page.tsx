import { TechnicalDetails } from '../../components/TechnicalDetails';
import { RuleLabel } from '../../components/RuleLabel';
import { Card, Notice, SectionTitle } from '../../components/layout';
import { InfoPageShell } from '../../components/InfoPageShell';
import { errorGap, formatRate, rate, type FairnessResults } from '../../lib/fairness';
import { shortDate } from '../../components/view';
import data from '../../../eval/results.json';

// Static: the numbers come from the committed eval/results.json (npm run eval).
const results = data as FairnessResults;

// Colour signals pass/fail only for live-model runs; replay numbers stay neutral.
const coloured = (data as FairnessResults).mode === 'live';

function Metric({ label, value, detail, good: goodIn }: { label: string; value: string; detail: string; good?: boolean }) {
  const good = coloured ? goodIn : undefined;
  return (
    <Card className="info-card min-w-0">
      <p className="text-sm text-muted">{label}</p>
      <p className="info-metric-value mt-1 text-[26px] font-extrabold tracking-tight tabular-nums" style={{ color: good === undefined ? 'var(--heading)' : good ? 'var(--success-text)' : 'var(--warning-text)' }}>{value}</p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </Card>
  );
}

function labelLine(total: number, reviewed: number, accepted: number): string {
  if (!reviewed && !accepted) return 'The expected outcomes for these cases are drafts that still need review.';
  const draft = total - reviewed - accepted;
  return `${reviewed} of ${total} expected outcomes were reviewed individually by the owner`
    + (accepted ? `; ${accepted} drafts were accepted by the owner without individual review` : '')
    + (draft ? `; ${draft} are still drafts` : '') + '.';
}

export default function FairnessPage() {
  const m = results.metrics;
  const falseRelease = rate(m.falseRelease, m.buyerRight);
  const falseRefund = rate(m.falseRefund, m.sellerRight);
  const flips = rate(m.variantFlips, m.variantCount);
  const consistency = rate(m.repeatMatches, m.repeatComparisons);
  const escalation = rate(m.escalation, m.total);
  const accuracy = rate(m.correctNonEscalated, m.nonEscalated);
  const injection = rate(m.injectionSuccess, m.injections);
  const gap = errorGap(m);
  const replay = results.mode === 'replay';

  return (
    <InfoPageShell title="Fairness results" subtitle={`${m.total} synthetic cases · ${replay ? 'Recorded AI answer' : `live model${results.model ? ` (${results.model})` : ''}`} · ${shortDate(results.generatedAt)}`}>
      <div className="info-content info-fairness space-y-5">
        {/* One summary; the replay caveat stays visible, details open on demand. */}
        <Notice className="info-notice" tone={replay || results.labelStatus === 'draft' ? 'warning' : 'info'}>
          <strong className="block">{replay ? 'Recorded test results: not a measurement of a live AI model.' : 'Live-model results for these synthetic cases only.'}</strong>
          <span className="mt-1 block">{labelLine(m.total, results.labelsReviewed ?? 0, results.labelsAccepted ?? 0)}</span>
          {replay && <details className="mt-2"><summary className="cursor-pointer font-semibold">What this means</summary>
            <p className="mt-1">These runs reuse recorded AI summaries authored from the original draft labels, including for counterfactual variants. They check the test harness, the rules and the injection flag, so perfect scores here prove nothing about model fairness.</p></details>}
        </Notice>

        <div className="info-metric-group">
          <SectionTitle>Does one side lose more often?</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric label="Incorrect charge recommendation" value={formatRate(falseRelease)} good={falseRelease.numerator === 0} detail={`${m.falseRelease} of ${m.buyerRight} buyer-right cases recommended charging the buyer`}/>
            <Metric label="Incorrect refund recommendation" value={formatRate(falseRefund)} good={falseRefund.numerator === 0} detail={`${m.falseRefund} of ${m.sellerRight} seller-right cases recommended a refund`}/>
            <Metric label="Gap between the two" value={gap === null ? 'n/a' : `${gap.toFixed(1)} pts`} detail="Difference between the incorrect-charge and incorrect-refund recommendation rates"/>
          </div>
        </div>

        <div className="info-metric-group">
          <SectionTitle>Does the outcome change for the wrong reasons?</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Metric label="Outcome changed by a variant" value={formatRate(flips)} good={flips.numerator === 0} detail={`${m.variantFlips} of ${m.variantCount} variants changed the recommendation. Variants swap names, reverse evidence order, shorten or lengthen the story, or make it formal or informal.`}/>
            <Metric label="Same answer on repeat" value={formatRate(consistency)} detail={`${m.repeatMatches} of ${m.repeatComparisons} repeated runs (k = ${results.k}) matched the first run`}/>
          </div>
        </div>

        <div className="info-metric-group">
          <SectionTitle>Safety</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric label="Injection attacks that got through" value={formatRate(injection)} good={injection.numerator === 0} detail={`${m.injectionSuccess} of ${m.injections} cases with instructions hidden in evidence avoided human review`}/>
            <Metric label="Sent to a human" value={formatRate(escalation)} detail={`${m.escalation} of ${m.total} cases. Every dispute outcome is still confirmed by a person.`}/>
            <Metric label="Matches the expected outcome" value={formatRate(accuracy)} detail={`${m.correctNonEscalated} of ${m.nonEscalated} cases not sent to a human`}/>
          </div>
        </div>

        {results.differing.length > 0 && (
          <Card className="info-card">
            <h2 className="mb-2 text-sm font-bold text-heading">Cases that differ from the expected outcome</h2>
            <TechnicalDetails><ul className="space-y-1 text-sm">{results.differing.map((d) => <li key={d.id} className="font-mono text-sm break-all">{d.id}: expected {d.expected}, got {d.actual}</li>)}</ul></TechnicalDetails>
          </Card>
        )}

        <Notice className="info-notice">Labels were written by the builder. The counts above distinguish individual owner review from drafts accepted without individual review; there are no independent annotators. These dispute cases test tracking problems, evidence-based recommendations, human review and suspicious instructions. Shipping and return checks also have unit tests. Damage and missing-parts disputes always need human review regardless of the AI summary. All cases are synthetic; no real people or personal data. {m.total} cases ({m.buyerRight} buyer right, {m.sellerRight} seller right, {m.unclear} unclear, {m.injections} with injection attempts) is a small sample: treat these numbers as indicative, not proof. Open Technical details for the tested rules and instructions to reproduce the report.</Notice>
        <TechnicalDetails><p>Dispute rules tested:</p><ul className="space-y-2">{['R3', 'R4', 'R5', 'R7'].map(rule => <li key={rule}><RuleLabel rule={rule}/></li>)}</ul><p>Shipping and return rules tested:</p><ul className="space-y-2">{['R1', 'R2', 'R3'].map(rule => <li key={rule}><RuleLabel rule={rule}/></li>)}</ul><p>Run <code>npm run eval</code> to reproduce the report; the full table is in eval/report.md.</p></TechnicalDetails>
      </div>
    </InfoPageShell>
  );
}
