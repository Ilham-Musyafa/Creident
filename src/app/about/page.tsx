import Link from 'next/link';
import { RULE_COPY as RULES } from '../../components/ruleCopy';
import { TechnicalDetails } from '../../components/TechnicalDetails';
import { Card } from '../../components/layout';
import { InfoPageShell } from '../../components/InfoPageShell';

const LIMITATIONS = [
  'PayPal Sandbox only. No real money. USD only.',
  'A dispute-mediation prototype, not an escrow service. A real launch needs an appropriately authorized payment partner, regulatory review and PayPal approval where required.',
  'Courier tracking is simulated. Seller payout is not implemented: completing a payment charges it into the platform’s Sandbox test account. Demo deals use simulated PayPal payments.',
  'Demo roles replace real sign-in.',
  'Evidence is text, including descriptions labelled as photos; camera capture and file upload are not built. Photo authenticity is not verified.',
  'On a full refund the fee is covered by the platform; the buyer is refunded in full. For a partial refund, the reviewer decides the amount.',
  'A refund waits for the item to be returned to the seller, unless the reviewer waives it (for example the item never arrived).',
  'The operator still runs the server. Records and signed copies make actions checkable; they cannot stop misuse.',
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
          <div className="info-rules space-y-2">{RULES.map(({id, title, text}) => <details key={id} className="info-rule group rounded-[18px] border border-line bg-surface">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1 text-base font-bold text-heading">{title}</span>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-xs font-bold text-heading">{id}</span><Chevron/>
            </summary>
            <p className="border-t border-line px-4 py-4 text-sm">{text}</p>
          </details>)}</div>
        </section>

        <section id="audit" aria-labelledby="audit-title">
          <h2 id="audit-title" className="mb-3 text-xl font-bold text-heading">Records & verification</h2>
          <Card className="info-card space-y-3">
            <p>Every action is saved in a record for that deal. Checks compare the saved steps and their order.</p>
            <p>The server owner could replace its data. Someone who keeps a trusted copy published elsewhere can compare it to spot later changes. Publishing those copies is manual.</p>
            <TechnicalDetails><p>Each record uses a hash chain. Signed checkpoints help reveal later rewriting to someone holding a published checkpoint and its trusted public key; they cannot prevent rewriting.</p></TechnicalDetails>
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
                <p>A reviewer can check for PayPal cases. The deadline check can also do this when it is run; there is no continuously running checker. Confirmed updates from PayPal can put matching deals on hold. The seller or reviewer can send a text PDF of agreed terms, recorded evidence, tracking, the decision and record details when PayPal allows it. An early-stage case may only allow a short message. Asking PayPal to step in needs confirmation and PayPal permission.</p>
                <TechnicalDetails><p>PayPal checks use polling and verified dispute/reversal webhooks. The evidence PDF includes the audit head. The separate client probe was tested; the integrated Sandbox flow and webhook delivery remain pending.</p></TechnicalDetails>
                <p>In simulated mode, a completed labelled demo deal lets the buyer open a simulated PayPal case and try the bridge without keys. The owner tested the PayPal connection separately in the Sandbox. The complete app flow has been checked with test clients and local simulation. Its real Sandbox run and delivery of PayPal’s automatic updates still need testing.</p>
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
