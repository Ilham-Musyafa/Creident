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
  if (!reviewed && !accepted) return 'The answer key for these cases is still a draft that needs review.';
  const draft = total - reviewed - accepted;
  return `${reviewed} of ${total} answers in the key were checked one by one by the owner`
    + (accepted ? `; ${accepted} drafts were accepted by the owner without checking each one` : '')
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
    <InfoPageShell title="Fairness results" subtitle={`${m.total} made-up test cases · ${replay ? 'Recorded AI answer' : `live model${results.model ? ` (${results.model})` : ''}`} · ${shortDate(results.generatedAt)}`}>
      <div className="info-content info-fairness space-y-5">
        <div className="space-y-1 text-sm leading-relaxed">
          <p>We tested Creident on made-up cases, including attempts to trick the AI.</p>
          <p>{replay ? 'These results use recorded AI answers, so they check our rules and test setup, not a live AI.' : 'These results come from a live AI model, so they check that model on these cases only.'}</p>
          <p>Every dispute outcome is still decided by a person.</p>
        </div>

        {/* One summary; the replay caveat stays visible, details open on demand. */}
        <Notice className="info-notice" tone={replay || results.labelStatus === 'draft' ? 'warning' : 'info'}>
          <strong className="block">{replay ? 'Recorded answers, not a live AI model.' : 'Live-model results for these made-up cases only.'}</strong>
          <span className="mt-1 block">{labelLine(m.total, results.labelsReviewed ?? 0, results.labelsAccepted ?? 0)}</span>
          {replay && <details className="mt-2"><summary className="cursor-pointer font-semibold">What this means</summary>
            <p className="mt-1">The AI answers were recorded earlier from the first draft of each answer key. These runs check our rules and our test setup, so a perfect score here does not show that an AI is fair.</p></details>}
        </Notice>

        <div className="info-metric-group">
          <SectionTitle>Is it fair to both buyers and sellers?</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric label="Wrongly sided with the seller" value={formatRate(falseRelease)} good={falseRelease.numerator === 0} detail={`${m.falseRelease} of ${m.buyerRight} cases where the buyer was right got a recommendation to charge the buyer`}/>
            <Metric label="Wrongly sided with the buyer" value={formatRate(falseRefund)} good={falseRefund.numerator === 0} detail={`${m.falseRefund} of ${m.sellerRight} cases where the seller was right got a recommendation to refund`}/>
            <Metric label="Difference between the two" value={gap === null ? 'n/a' : `${gap.toFixed(1)} percentage points`} detail="Difference between the two wrong-side results above"/>
          </div>
        </div>

        <div className="info-metric-group">
          <SectionTitle>Does it change its answer for the wrong reasons?</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Metric label="Changed its answer when only the wording changed" value={formatRate(flips)} good={flips.numerator === 0} detail={`${m.variantFlips} of ${m.variantCount} cases changed their answer when only the wording of the case changed`}/>
            <Metric label="Gave the same answer every time" value={formatRate(consistency)} detail={`${m.repeatMatches} of ${m.repeatComparisons} repeated runs gave the same answer as the first run`}/>
          </div>
        </div>

        <div className="info-metric-group">
          <SectionTitle>Safety</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric label="Hidden tricks in the evidence that worked" value={formatRate(injection)} good={injection.numerator === 0} detail={`${m.injectionSuccess} of ${m.injections} cases with hidden tricks in the evidence skipped a person`}/>
            <Metric label="Passed to a person to decide" value={formatRate(escalation)} detail={`${m.escalation} of ${m.total} cases. Every dispute outcome is still confirmed by a person.`}/>
            <Metric label="Agrees with our answer key" value={formatRate(accuracy)} detail={`${m.correctNonEscalated} of ${m.nonEscalated} cases not passed to a person`}/>
          </div>
        </div>

        {results.differing.length > 0 && (
          <Card className="info-card">
            <h2 className="mb-2 text-sm font-bold text-heading">Cases that differ from our answer key</h2>
            <TechnicalDetails><ul className="space-y-1 text-sm">{results.differing.map((d) => <li key={d.id} className="font-mono text-sm break-all">{d.id}: expected {d.expected}, got {d.actual}</li>)}</ul></TechnicalDetails>
          </Card>
        )}

        <Notice className="info-notice">The answer key was written by the builder. The counts above separate answers the owner checked one by one from drafts accepted without checking each one; nobody outside the project checked them. These cases cover tracking problems, decisions from evidence, human review and hidden instructions. Shipping and return checks also have their own tests. Damage and missing-parts problems always need a person, whatever the AI says. All cases are made up; no real people or personal data. {m.total} cases ({m.buyerRight} where the buyer was right, {m.sellerRight} where the seller was right, {m.unclear} unclear, {m.injections} with hidden tricks) is a small sample: treat these numbers as a rough sign, not proof. Open Technical details for the rules tested and how to reproduce the report.</Notice>
        <TechnicalDetails>
          <p>Jargon used above:</p>
          <ul className="space-y-1">
            <li>Case variants: each case is re-run with its counterfactual variants, which swap the names, reverse the evidence order, shorten or lengthen the story, or make it formal or informal.</li>
            <li>Repeated runs: every case is run {results.k} times (k = {results.k}) to check the answer stays the same.</li>
          </ul>
          <p>Rules tested:</p><ul className="space-y-2">{['R3', 'R4', 'R5', 'R7'].map(rule => <li key={rule}><RuleLabel rule={rule}/></li>)}</ul><p>Shipping and return rules tested:</p><ul className="space-y-2">{['R1', 'R2', 'R3'].map(rule => <li key={rule}><RuleLabel rule={rule}/></li>)}</ul><p>Run <code>npm run eval</code> to reproduce the report; the full table is in eval/report.md.</p>
        </TechnicalDetails>
      </div>
    </InfoPageShell>
  );
}
