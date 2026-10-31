import { TechnicalDetails } from '../../components/TechnicalDetails';
import { RuleLabel } from '../../components/RuleLabel';
import { Card, Notice, SectionTitle } from '../../components/layout';
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

/** One result row: label, "n of N" and a bar showing the share. Colour stays neutral for recorded (replay) runs. */
function Stat({ label, r, detail, good: goodIn }: { label: string; r: Rate; detail: string; good?: boolean }) {
  const good = coloured ? goodIn : undefined;
  const tone = good === undefined ? 'var(--accent)' : good ? 'var(--completed-text)' : 'var(--awaiting-text)';
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-heading">{label}</p>
        <p className="text-xl font-extrabold tabular-nums text-heading">{formatRate(r)}</p>
      </div>
      <div role="img" aria-label={`${label}: ${formatRate(r)}`} className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${Math.min(100, r.percent ?? 0)}%`, background: tone }}/></div>
      <p className="mt-1.5 text-sm text-muted">{detail}</p>
    </div>
  );
}

function Panel({ icon, title, hint, children }: { icon: IconName; title: string; hint: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-[24px] border border-line bg-surface p-5">
      <header className="mb-4 flex items-start gap-3">
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
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" role="img" aria-label={parts.map(part => `${part.label}: ${part.value}`).join(', ')} className="size-36 shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="16"/>
        {parts.map(part => { const length = (part.value / total) * circ; const el = <circle key={part.label} cx="70" cy="70" r={radius} fill="none" stroke={part.colour} strokeWidth="16" strokeDasharray={`${Math.max(length - 2, 0)} ${circ}`} strokeDashoffset={-offset}/>; offset += length; return el; })}
        <g className="rotate-90 origin-center" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}><text x="70" y="70" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="22" fontWeight="800">{centre}</text></g>
      </svg>
      <ul className="min-w-0 space-y-2 text-sm">
        <li className="mb-1 text-hero-sub">{caption}</li>
        {parts.map(part => <li key={part.label} className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: part.colour }}/><span className="text-hero-text">{part.label}</span><span className="ml-auto pl-2 font-bold tabular-nums text-hero-text">{part.value}</span></li>)}
      </ul>
    </div>
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
        <div className="grid gap-5 lg:grid-cols-12">
          <section aria-label="Summary" className="rounded-[24px] border border-line bg-gradient-to-br from-surface-2 to-surface p-6 lg:col-span-7">
            <p className="text-sm text-muted">{replay ? 'Recorded AI answers' : 'Live model'} · made-up cases only</p>
            <p className="mt-2 text-[40px] font-extrabold leading-none tabular-nums text-heading">{m.total}</p>
            <p className="mt-1 text-lg font-semibold text-heading">test cases, including attempts to trick the AI</p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{replay ? 'These results use recorded AI answers, so they check our rules and test setup, not a live AI.' : 'These results come from a live AI model, so they check that model on these cases only.'} Every dispute outcome is still decided by a person.</p>
          </section>
          <section aria-label="Where the cases ended up" className="rounded-[24px] border border-[var(--accent)] bg-hero p-6 text-hero-text lg:col-span-5">
            <Donut centre={formatRate(escalation)} caption="Passed to a person"
              parts={[{ label: 'Passed to a person', value: m.escalation, colour: '#93C5FD' }, { label: 'Agrees with our key', value: m.correctNonEscalated, colour: '#3B82F6' }, { label: 'Differs from our key', value: m.nonEscalated - m.correctNonEscalated, colour: '#FCD34D' }]}/>
          </section>
        </div>

        {/* One summary; the replay caveat stays visible, details open on demand. */}
        <Notice className="info-notice" tone={replay || results.labelStatus === 'draft' ? 'warning' : 'info'}>
          <strong className="block">{replay ? 'Recorded answers, not a live AI model.' : 'Live-model results for these made-up cases only.'}</strong>
          <span className="mt-1 block">{labelLine(m.total, results.labelsReviewed ?? 0, results.labelsAccepted ?? 0)}</span>
          {replay && <details className="mt-2"><summary className="cursor-pointer font-semibold">What this means</summary>
            <p className="mt-1">The AI answers were recorded earlier from the first draft of each answer key. These runs check our rules and our test setup, so a perfect score here does not show that an AI is fair.</p></details>}
        </Notice>

        <div className="grid gap-5 lg:grid-cols-3">
          <Panel icon="scale" title="Buyers and sellers" hint="Does it lean to one side?">
            <Stat label="Wrongly sided with the seller" r={falseRelease} good={falseRelease.numerator === 0} detail={`${m.falseRelease} of ${m.buyerRight} cases where the buyer was right got a recommendation to charge the buyer`}/>
            <Stat label="Wrongly sided with the buyer" r={falseRefund} good={falseRefund.numerator === 0} detail={`${m.falseRefund} of ${m.sellerRight} cases where the seller was right got a recommendation to refund`}/>
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-heading">Difference between the two: <strong className="tabular-nums">{gap === null ? 'n/a' : `${gap.toFixed(1)} percentage points`}</strong></p>
          </Panel>
          <Panel icon="repeat" title="Steady answers" hint="Does it change for the wrong reasons?">
            <Stat label="Changed when only the wording changed" r={flips} good={flips.numerator === 0} detail={`${m.variantFlips} of ${m.variantCount} cases changed their answer when only the wording of the case changed`}/>
            <Stat label="Same answer every time" r={consistency} detail={`${m.repeatMatches} of ${m.repeatComparisons} repeated runs gave the same answer as the first run`}/>
          </Panel>
          <Panel icon="shield" title="Safety" hint="Can hidden text steer it?">
            <Stat label="Hidden tricks that worked" r={injection} good={injection.numerator === 0} detail={`${m.injectionSuccess} of ${m.injections} cases with hidden tricks in the evidence skipped a person`}/>
            <Stat label="Agrees with our answer key" r={accuracy} detail={`${m.correctNonEscalated} of ${m.nonEscalated} cases not passed to a person`}/>
          </Panel>
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
