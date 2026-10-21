import { AppShell, Card, Notice, PageHeader, SectionTitle } from '../../components/layout';
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
    <Card className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-[26px] font-extrabold tracking-tight tabular-nums" style={{ color: good === undefined ? 'var(--heading)' : good ? 'var(--success-text)' : 'var(--warning-text)' }}>{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </Card>
  );
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
    <AppShell active="Menu">
      <PageHeader title="Fairness results" back="/menu" subtitle={`${m.total} synthetic cases · ${replay ? 'replay mode' : `live model${results.model ? ` (${results.model})` : ''}`} · ${shortDate(results.generatedAt)}`}/>
      <div className="space-y-5">
        {replay && <Notice tone="warning">Replay mode: these runs reuse recorded AI summaries written from the draft labels. They check the test harness, the rules and the injection flag. They do not measure a live AI model, so perfect scores here prove nothing about model fairness.</Notice>}
        {results.labelStatus === 'draft' && <Notice tone="warning">{results.labelsReviewed ? `${results.labelsReviewed} of ${m.total} expected outcomes were reviewed by the owner; the rest are drafts.` : 'The expected outcomes for these cases are drafts that still need review.'}</Notice>}

        <div>
          <SectionTitle>Does one side lose more often?</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric label="False release" value={formatRate(falseRelease)} good={falseRelease.numerator === 0} detail={`${m.falseRelease} of ${m.buyerRight} cases where the buyer was right ended in release to the seller`}/>
            <Metric label="False refund" value={formatRate(falseRefund)} good={falseRefund.numerator === 0} detail={`${m.falseRefund} of ${m.sellerRight} cases where the seller was right ended in a refund`}/>
            <Metric label="Gap between the two" value={gap === null ? 'n/a' : `${gap.toFixed(1)} pts`} detail="Difference between the false-release and false-refund rates"/>
          </div>
        </div>

        <div>
          <SectionTitle>Does the outcome change for the wrong reasons?</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Metric label="Outcome changed by a variant" value={formatRate(flips)} good={flips.numerator === 0} detail={`${m.variantFlips} of ${m.variantCount} variants changed the recommendation. Variants swap names, reverse evidence order, shorten or lengthen the story, or make it formal or informal.`}/>
            <Metric label="Same answer on repeat" value={formatRate(consistency)} detail={`${m.repeatMatches} of ${m.repeatComparisons} repeated runs (k = ${results.k}) matched the first run`}/>
          </div>
        </div>

        <div>
          <SectionTitle>Safety</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric label="Injection attacks that got through" value={formatRate(injection)} good={injection.numerator === 0} detail={`${m.injectionSuccess} of ${m.injections} cases with instructions hidden in evidence avoided human review`}/>
            <Metric label="Sent to a human" value={formatRate(escalation)} detail={`${m.escalation} of ${m.total} cases. Every dispute outcome is still confirmed by a person.`}/>
            <Metric label="Matches the expected outcome" value={formatRate(accuracy)} detail={`${m.correctNonEscalated} of ${m.nonEscalated} cases not sent to a human`}/>
          </div>
        </div>

        {results.differing.length > 0 && (
          <Card>
            <h2 className="mb-2 text-sm font-bold text-heading">Cases that differ from the expected outcome</h2>
            <ul className="space-y-1 text-sm">{results.differing.map((d) => <li key={d.id} className="font-mono text-xs break-all">{d.id}: expected {d.expected}, got {d.actual}</li>)}</ul>
          </Card>
        )}

        <Notice>Labels were written by the builder and reviewed by one person, not by independent annotators. These cases test the dispute rules (R4, R5, R7); the shipping rules R1-R3 have their own unit tests. All cases are synthetic; no real people or personal data. {m.total} cases ({m.buyerRight} buyer right, {m.sellerRight} seller right, {m.unclear} unclear, {m.injections} with injection attempts) is a small sample: treat these numbers as indicative, not proof. Run <code className="font-mono">npm run eval</code> to reproduce them; the full table is in eval/report.md.</Notice>
      </div>
    </AppShell>
  );
}
