import Link from 'next/link';
import { Card } from '../../components/layout';
import { InfoPageShell } from '../../components/InfoPageShell';

const RULES = [
  ['R1', 'Not shipped in time', 'No tracking before the ship-by deadline: the payment is cancelled before charging. No money moves.'],
  ['R2', 'Delivery and inspection complete', 'Delivered to the agreed address and the buyer confirmed or stayed silent through inspection: the approved payment is charged. Seller payout is not part of this demo.'],
  ['R3', 'Tracking does not match', 'Tracking does not fit the order (other destination or impossible ship date): a human reviews.'],
  ['R4', 'Evidence clearly supports one side', 'In a dispute, every criterion clearly supports one side with evidence: a recommendation, confirmed by a human.'],
  ['R5', 'A reviewer needs to decide', 'Missing, unclear or mixed evidence, no usable AI summary, or damage / missing-parts disputes: a human decides regardless of the summary.'],
  ['R6', 'A PayPal case puts the deal on hold', 'A matching PayPal dispute poll or verified dispute/reversal webhook puts the deal on hold. Resolution resumes the prior local state; the financial outcome needs a separate check.'],
  ['R7', 'Evidence contains instructions to the AI', 'Evidence looks like instructions aimed at the AI: the text is ignored for scoring and a human reviews.'],
];
const LIMITATIONS = [
  'PayPal Sandbox only. No real money. USD only.',
  'A dispute-mediation prototype, not an escrow service. A real launch needs an appropriately authorized payment partner, regulatory review and PayPal approval where required.',
  'Courier tracking is simulated. Seller payout is not implemented: completing a payment charges it into the Sandbox merchant account. Demo deals use simulated PayPal payments.',
  'Demo roles replace real sign-in.',
  'Evidence is text, including descriptions labelled as photos; camera capture and file upload are not built. Photo authenticity is not verified.',
  'On a full refund the platform bears the PayPal fee; the buyer is refunded in full. For a partial refund, the reviewer decides the amount.',
  'A refund waits for the item to be returned to the seller, unless the reviewer waives it (for example the item never arrived).',
  'The operator still runs the server; the audit log and signed checkpoints make its actions checkable, not impossible to misuse.',
];
function Chevron() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6"/></svg>;
}

export default function AboutPage() {
  return (
    <InfoPageShell title="About Creident" subtitle="A dispute-mediation prototype for peer-to-peer sales, built for the PayPal AI Hackathon 2026.">
      <div className="info-content mx-auto max-w-3xl space-y-6 text-sm leading-relaxed">
        <section id="decisions" aria-labelledby="decisions-title">
          <h2 id="decisions-title" className="mb-3 text-xl font-bold text-heading">How decisions are made</h2>
          <p className="mb-4">Buyer and seller agree on the terms before payment. PayPal approves first without charging. Rules guide what happens next; a human confirms every dispute outcome. The AI summarises evidence and cannot move money.</p>
          <div className="info-rules space-y-2">{RULES.map(([id, title, text]) => <details key={id} className="info-rule group rounded-[18px] border border-line bg-surface">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-xs font-bold text-heading">{id}</span>
              <span className="min-w-0 flex-1 text-base font-bold text-heading">{title}</span><Chevron/>
            </summary>
            <p className="border-t border-line px-4 py-4 text-sm">{text}</p>
          </details>)}</div>
        </section>

        <section id="audit" aria-labelledby="audit-title">
          <h2 id="audit-title" className="mb-3 text-xl font-bold text-heading">Audit & verification</h2>
          <Card className="info-card space-y-3">
            <p>Every action is recorded in an append-only, hash-chained log per deal. Verification checks event content, sequence and links.</p>
            <p>The operator can still rewrite the database and recompute a chain. Signed checkpoints make later rewriting detectable to someone holding a published checkpoint and its trusted public key. Publishing is manual.</p>
            <Link href="/audit" className="inline-flex min-h-11 items-center font-semibold text-heading underline">Explore the deal records</Link>
          </Card>
        </section>

        <section aria-labelledby="bridge-title">
          <h2 id="bridge-title" className="mb-3 text-xl font-bold text-heading">PayPal dispute bridge</h2>
          <Card className="info-card space-y-3">
            <p>Matching PayPal disputes put a deal on hold. The seller or reviewer can send the deal’s locked evidence when PayPal permits it.</p>
            <details className="group border-t border-line pt-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-heading [&::-webkit-details-marker]:hidden">How the bridge works<Chevron/></summary>
              <div className="space-y-3 pt-2">
                <p>A reviewer can check PayPal cases, and the deadline tick polls too; there is no background worker. Verified webhooks also put matching deals on hold. Seller or reviewer can send a text PDF of locked terms, audited evidence, tracking, any decision and the audit head when PayPal offers evidence submission. Inquiry may only allow a short message; escalation to a claim needs confirmation and PayPal permission.</p>
                <p>In simulated mode, a completed labelled demo deal lets the buyer open a simulated PayPal case and try the bridge without keys. The owner tested the separate client probe in the Sandbox; the integrated bridge has fake-client and local-simulation checks. Its real Sandbox run and real webhook delivery remain pending.</p>
              </div>
            </details>
          </Card>
        </section>

        <section aria-labelledby="evaluation-title">
          <h2 id="evaluation-title" className="mb-3 text-xl font-bold text-heading">Evaluation status</h2>
          <Card className="info-card space-y-3">
            <p>The synthetic-case report lists its sample sizes, label-review status and measured results. Replay uses recorded AI summaries authored from draft labels: it checks the harness and rules, not a live model.</p>
            <Link href="/fairness" className="inline-flex min-h-11 items-center font-semibold text-heading underline">Read the results and caveats</Link>
          </Card>
        </section>

        <section id="limitations" aria-labelledby="limitations-title">
          <h2 id="limitations-title" className="mb-3 text-xl font-bold text-heading">Limitations</h2>
          <Card className="info-card">
            <p className="font-semibold text-heading">Demo only. No real money, real sign-in or seller payout. This is not an escrow service.</p>
            <details className="group mt-3 border-t border-line">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-heading [&::-webkit-details-marker]:hidden">Read all limitations<Chevron/></summary>
              <ul className="list-disc space-y-3 pb-1 pl-5 pt-2">{LIMITATIONS.map(text => <li key={text}>{text}</li>)}</ul>
            </details>
          </Card>
        </section>
      </div>
    </InfoPageShell>
  );
}
