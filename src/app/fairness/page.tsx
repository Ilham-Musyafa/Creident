import { PAYMENT_ACTION_LABELS } from '../../components/presentationCopy';
import { TechnicalDetails } from '../../components/TechnicalDetails';
import { RuleLabel } from '../../components/RuleLabel';
import { Card, Notice } from '../../components/layout';
import { InfoPageShell } from '../../components/InfoPageShell';
import type { ReactNode } from 'react';
import { errorGap, formatRate, rate, type FairnessResults, type Rate } from '../../lib/fairness';
import { shortDate } from '../../components/view';
import data from '../../../eval/results.json';

// Static: the numbers come from the committed eval/results.json (npm run eval).
const results = data as FairnessResults;

// Colour signals pass/fail only for live-model runs; replay numbers stay neutral.
const coloured = (data as FairnessResults).mode === 'live';

type IconName = 'scale' | 'repeat' | 'shield' | 'person';
const ICONS: Record<IconName, ReactNode> = {
  scale: <path d="M12 4v16M6 20h12M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0zm14 0-2.5 6a3 3 0 0 0 5 0z"/>,
  repeat: <path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3m13-3v2a4 4 0 0 1-4 4H4"/>,
  shield: <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6zm-3 9 2 2 4-4"/>,
  person: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0"/>,
};
function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{ICONS[name]}</svg>;
}

/** Recorded-answer metrics use neutral cues, not a live-model pass/fail claim. */
function MetricCue({ direction, best }: { direction: 'lower' | 'higher'; best: boolean }) {
  return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted"><span aria-hidden="true">{best ? '✓' : '○'}</span>{direction === 'lower' ? 'Lower is better' : 'Higher is better'}{best && <span className="sr-only"> · At best value</span>}</span>;
}

/** Counts come first; every bar fills with the measured percentage, regardless of direction. */
function Stat({ label, r, detail, direction }: { label: string; r: Rate; detail: string; direction: 'lower' | 'higher' }) {
  const best = r.denominator > 0 && (direction === 'lower' ? r.numerator === 0 : r.numerator === r.denominator);
  const tone = !coloured ? 'var(--accent)' : best ? 'var(--completed-text)' : 'var(--awaiting-text)';
  return (
    <div className="fairness-stat min-w-0">
      <p className="text-sm font-semibold text-heading">{label}</p>
      <MetricCue direction={direction} best={best}/>
      <p className="mt-1 text-xl font-extrabold tabular-nums text-heading">{r.numerator} of {r.denominator}<span className="ml-2 text-sm font-medium text-muted">({formatRate(r)})</span></p>
      <div role="img" aria-label={`${label}: ${r.numerator} of ${r.denominator}, ${formatRate(r)}`} className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${Math.min(100, r.percent ?? 0)}%`, background: tone }}/></div>
      <p className="mt-1.5 text-sm text-muted">{detail}</p>
    </div>
  );
}

function Panel({ icon, title, hint, children }: { icon: IconName; title: string; hint: string; children: ReactNode }) {
  return (
    <section className="fairness-metric-panel min-w-0 rounded-[24px] border border-line bg-surface p-5">
      <header className="mb-4 flex items-start gap-3 lg:min-h-16">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-heading"><Icon name={icon}/></span>
        <div><h2 className="text-base font-bold text-heading">{title}</h2><p className="text-sm text-muted">{hint}</p></div>
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** Donut of where the test cases ended up. Drawn with SVG strokes, no chart library. */
function Donut({ parts, centre, caption }: { parts: { label: string; value: number; colour: string }[]; centre: string; caption: string }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  const radius = 52; const circ = 2 * Math.PI * radius; let offset = 0;
  return (
    <div className="fairness-donut">
      <svg viewBox="0 0 140 140" role="img" aria-label={parts.map(part => `${part.label}: ${part.value}`).join(', ')} className="size-40 shrink-0">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--desktop-sidebar-line)" strokeWidth="16"/>
        {parts.map(part => { const length = (part.value / total) * circ; const el = <circle key={part.label} cx="70" cy="70" r={radius} fill="none" stroke={part.colour} strokeWidth="16" strokeDasharray={`${Math.max(length - 2, 0)} ${circ}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)"/>; offset += length; return el; })}
        <g><text x="70" y="70" textAnchor="middle" dominantBaseline="central" fill="var(--hero-text)" fontSize="30" fontWeight="800">{centre}</text><text x="70" y="94" textAnchor="middle" fill="var(--hero-sub)" fontSize="12">cases</text></g>
      </svg>
      <ul className="min-w-0 w-full space-y-3 text-sm">
        <li className="mb-1 text-hero-sub">{caption}</li>
        {parts.map(part => <li key={part.label} className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: part.colour }}/><span className="text-hero-text">{part.label}</span><span className="ml-auto pl-2 font-bold tabular-nums text-hero-text">{part.value}</span></li>)}
      </ul>
    </div>
  );
}

function LabelStatus({ total, reviewed, accepted }: { total: number; reviewed: number; accepted: number }) {
  if (!reviewed && !accepted) return <p>The answer key for these cases is still a draft that needs review.</p>;
  return <ul className="fairness-label-status mt-2 space-y-1">
    <li>{reviewed} answers in the answer key checked one by one by the owner.</li>
    <li>{accepted} drafts accepted by the owner without checking each one.</li>
    <li>{total - reviewed - accepted} answers still drafts.</li>
  </ul>;
}

function caseTitle(id: string): string {
  return id.replace(/^shipping_/, 'Shipping · ').replace(/^return_/, 'Return · ')
    .replace('unknown_destination_unclear', 'destination unclear')
    .replace('wrong_destination_unclear', 'wrong destination, unclear').replaceAll('_', ' ');
}

export default function FairnessPage() {
  const m = results.metrics;
  const falseRelease = rate(m.falseRelease, m.buyerRight);
  const falseRefund = rate(m.falseRefund, m.sellerRight);
  const flips = rate(m.variantFlips, m.variantCount);
  const consistency = rate(m.repeatMatches, m.repeatComparisons);

  const accuracy = rate(m.correctNonEscalated, m.nonEscalated);
  const injection = rate(m.injectionSuccess, m.injections);
  const gap = errorGap(m);
  const replay = results.mode === 'replay';

  return (
    <InfoPageShell title="Fairness results" subtitle={`${m.total} made-up test cases · ${replay ? 'Recorded AI answer' : `live model${results.model ? ` (${results.model})` : ''}`} · ${shortDate(results.generatedAt)}`}>
      <div className="info-content info-fairness mx-auto max-w-[1120px] lg:mx-0 lg:max-w-none space-y-5">
        <div className="grid gap-5 lg:grid-cols-12">
          <section aria-label="Summary" className="fairness-summary rounded-[24px] border border-line p-6 lg:col-span-6">
            <p className="inline-flex rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-heading">{replay ? 'Recorded AI answers' : 'Live model'}</p>
            <p className="mt-2 text-[40px] font-extrabold leading-none tabular-nums text-heading">{m.total}</p>
            <p className="mt-1 text-lg font-semibold text-heading">test cases, including attempts to trick the AI</p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{replay ? 'These results use recorded AI answers, so they check our rules and test setup, not a live AI.' : 'These results come from a live AI model, so they check that model on these cases only.'} Every dispute outcome is still decided by a person.</p>
          </section>
          <section aria-label="Where the cases ended up" className="rounded-[24px] border border-[var(--accent)] bg-[var(--brand-navy)] p-6 text-hero-text lg:col-span-6">
            <h2 className="mb-4 text-lg font-bold">Where the cases ended up</h2>
            <Donut centre={String(m.total)} caption={`Out of ${m.total} made-up cases`}
              parts={[{ label: 'Passed to a person', value: m.escalation, colour: 'var(--brand-sky)' }, { label: 'Agrees with our answer key', value: m.correctNonEscalated, colour: 'var(--brand-sapphire)' }, { label: 'Differs from our answer key', value: m.nonEscalated - m.correctNonEscalated, colour: 'var(--brand-ice)' }]}/>
          </section>
        </div>

        {/* One summary; the replay caveat stays visible, details open on demand. */}
        <Notice className="info-notice fairness-recorded-note" tone={replay || results.labelStatus === 'draft' ? 'warning' : 'info'}>
          <strong className="block">{replay ? 'Recorded answers, not a live AI model.' : 'Live-model results for these made-up cases only.'}</strong>
          <LabelStatus total={m.total} reviewed={results.labelsReviewed ?? 0} accepted={results.labelsAccepted ?? 0}/>
          {replay && <details className="mt-2"><summary className="flex min-h-11 cursor-pointer items-center font-semibold">What this means</summary>
            <p className="mt-1">The AI answers were recorded earlier from the first draft of each answer key. These runs check our rules and our test setup, so agreement with the answer key here does not measure a live model.</p></details>}
        </Notice>

        <div className="grid gap-5 lg:grid-cols-3">
          <Panel icon="scale" title="Buyers and sellers" hint="Does it lean to one side?">
            <Stat label="Wrongly sided with the seller" r={falseRelease} direction="lower" detail={`${m.falseRelease} of ${m.buyerRight} cases where the buyer was right got a recommendation to charge the buyer`}/>
            <Stat label="Wrongly sided with the buyer" r={falseRefund} direction="lower" detail={`${m.falseRefund} of ${m.sellerRight} cases where the seller was right got a recommendation to refund`}/>
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-heading">Difference between the two: <strong className="tabular-nums">{gap === null ? 'n/a' : `${gap.toFixed(1)} percentage points`}</strong><span className="mt-1 block"><MetricCue direction="lower" best={gap === 0}/></span></p>
          </Panel>
          <Panel icon="repeat" title="Steady answers" hint="Does it change for the wrong reasons?">
            <Stat label="Changed across case variations" r={flips} direction="lower" detail={`${m.variantFlips} of ${m.variantCount} cases changed their answer when names, evidence order or wording changed`}/>
            <Stat label="Same answer every time" r={consistency} direction="higher" detail={`${m.repeatMatches} of ${m.repeatComparisons} repeated runs gave the same answer as the first run`}/>
            <Stat label="Agrees with our answer key" r={accuracy} direction="higher" detail={`${m.correctNonEscalated} of ${m.nonEscalated} cases not passed to a person`}/>
          </Panel>
          <Panel icon="shield" title="Safety" hint="Can hidden text steer it?">
            <Stat label="Hidden tricks that worked" r={injection} direction="lower" detail={`${m.injectionSuccess} of ${m.injections} cases with hidden tricks in the evidence skipped a person`}/>
          </Panel>
        </div>

        {results.differing.length > 0 && (
          <Card className="info-card">
            <h2 className="mb-2 text-sm font-bold text-heading">Cases that differ from our answer key</h2>
            <p className="mb-3 text-sm text-muted">{results.differing.length} of {m.total} made-up cases differed from the answer key.</p>
            <ul className="space-y-3">{results.differing.map(d => <li key={d.id}>
              <details className="fairness-case rounded-xl border border-line px-4 text-sm">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-3 font-semibold text-heading">{caseTitle(d.id)}<span aria-hidden="true">▾</span></summary>
                <div className="space-y-2 border-t border-line py-3">
                  <p>Our answer key said {PAYMENT_ACTION_LABELS[d.expected] ?? d.expected.toLowerCase().replaceAll('_', ' ')}.</p>
                  <p>The recorded answer said {PAYMENT_ACTION_LABELS[d.actual] ?? d.actual.toLowerCase().replaceAll('_', ' ')}.</p>
                  <div className="rounded-lg bg-surface-2 p-3 text-muted"><h3 className="font-semibold">Technical details</h3><p className="mt-1 break-all">Case ID: {d.id}</p><p>Expected: {d.expected}; recorded result: {d.actual}</p></div>
                </div>
              </details>
            </li>)}</ul>
          </Card>
        )}

        <Notice className="info-notice fairness-scope-note"><ul className="list-disc space-y-3 pl-5">
          <li>The answer key was written by the builder. The counts above separate answers the owner checked one by one from drafts accepted without checking each one; nobody outside the project checked them.</li>
          <li>All cases are made up; no real people or personal data. They cover tracking problems, decisions from evidence, human review and hidden instructions. Shipping and return checks also have their own tests.</li>
          <li>{m.total} cases ({m.buyerRight} where the buyer was right, {m.sellerRight} where the seller was right, {m.unclear} unclear, {m.injections} with hidden tricks) is a small sample: treat these numbers as a limited snapshot.</li>
          <li>Damage and missing-parts problems always need a person, whatever the AI says.</li>
        </ul><p className="mt-3">Open Technical details for the rules tested and how to reproduce the report.</p></Notice>
        <Card className="info-card fairness-technical">
        <TechnicalDetails>
          <p>Jargon used above:</p>
          <ul className="space-y-1">
            <li>Case variants: each case is re-run with its counterfactual variants, which swap the names, reverse the evidence order, shorten or lengthen the story, or make it formal or informal.</li>
            <li>Repeated runs: every case is run {results.k} times (k = {results.k}) to check the answer stays the same.</li>
          </ul>
          <p>Rules tested:</p><ul className="space-y-2">{['R3', 'R4', 'R5', 'R7'].map(rule => <li key={rule}><RuleLabel rule={rule}/></li>)}</ul><p>Shipping and return rules tested:</p><ul className="space-y-2">{['R1', 'R2', 'R3'].map(rule => <li key={rule}><RuleLabel rule={rule}/></li>)}</ul><p>Run <code>npm run eval</code> to reproduce the report; the full table is in eval/report.md.</p>
        </TechnicalDetails>
        </Card>
      </div>
    </InfoPageShell>
  );
}
