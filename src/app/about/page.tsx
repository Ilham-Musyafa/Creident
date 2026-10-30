import Link from 'next/link';
import { TechnicalDetails } from '../../components/TechnicalDetails';
import { Card } from '../../components/layout';
import { ButtonLink } from '../../components/ui';
import { InfoPageShell } from '../../components/InfoPageShell';

const LIMITATIONS = [
  'Test mode only: PayPal Sandbox, no real money, US dollars only.',
  'This is a demo of the dispute step, not a service that holds your money. A real launch would need an appropriately authorized payment partner and regulatory review, and PayPal approval where required.',
  'Courier tracking is simulated. Paying the seller is not built: a completed payment goes to a test account. Demo deals use simulated PayPal payments.',
  'Demo roles (buyer, seller, reviewer) replace real sign-in.',
  'Evidence is text only. Taking photos and uploading files are not built, and photos are not checked for authenticity.',
  'On a full refund, the platform covers the PayPal fee, so the buyer gets everything back. For a part refund, the reviewer decides the amount.',
  'A refund waits until the item is back with the seller, unless the reviewer decides to skip that (for example when the item never arrived).',
  'After the buyer confirms receipt, the deal is complete. A problem found later is not reopened in this demo, so a buyer should report a problem before confirming.',
  'The people running the server can still change data. Saved history and saved copies help spot changes, but they cannot stop misuse.',
];

function Chevron() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6"/></svg>;
}

export default function AboutPage() {
  return (
    <InfoPageShell title="About Creident" subtitle="A demo of the dispute step for peer-to-peer sales, built for the PayPal AI Hackathon 2026.">
      <div className="info-content mx-auto max-w-3xl space-y-6 text-sm leading-relaxed">
        <section aria-labelledby="intro-title">
          <h2 id="intro-title" className="mb-3 text-xl font-bold text-heading">What is Creident?</h2>
          <Card className="info-card space-y-3">
            <p>Creident helps when a sale between two people goes wrong. The buyer approves the payment, the seller ships, and if there is a problem, simple rules and a person settle it. Every step is saved.</p>
            <p className="font-semibold text-heading">Demo only. No real money.</p>
          </Card>
        </section>

        <section id="decisions" aria-labelledby="decisions-title">
          <h2 id="decisions-title" className="mb-3 text-xl font-bold text-heading">How it works</h2>
          <Card className="info-card space-y-3">
            <p>From agreeing on an item to checking what happened, in six simple steps.</p>
            <ButtonLink href="/how-it-works">See how it works</ButtonLink>
          </Card>
        </section>

        <section id="audit" aria-labelledby="audit-title">
          <h2 id="audit-title" className="mb-3 text-xl font-bold text-heading">Can I trust the history?</h2>
          <Card className="info-card space-y-3">
            <p>Every step of a deal is saved, so you can check later whether anything was changed. The people running the server could still change the data. Saved copies kept somewhere else help spot that.</p>
            <TechnicalDetails><p>Each record uses a hash chain. Signed checkpoints help reveal later rewriting to someone holding a published checkpoint and its trusted public key; they cannot prevent rewriting.</p></TechnicalDetails>
            <Link href="/audit" className="inline-flex min-h-11 items-center font-semibold text-heading underline">See the deal history</Link>
          </Card>
        </section>

        <section aria-labelledby="bridge-title">
          <h2 id="bridge-title" className="mb-3 text-xl font-bold text-heading">Works with PayPal</h2>
          <Card className="info-card space-y-3">
            <p>If a buyer opens a PayPal dispute, the deal pauses. The seller or reviewer can send the saved evidence to PayPal.</p>
            <details className="group border-t border-line pt-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-heading [&::-webkit-details-marker]:hidden">More details<Chevron/></summary>
              <div className="space-y-3 pt-2">
                <p>A reviewer can check for PayPal cases. The deadline check can also do this when it is run; there is no continuously running checker. Confirmed updates from PayPal can put matching deals on hold. The seller or reviewer can send a text PDF of agreed terms, recorded evidence, tracking, the decision and record details when PayPal allows it. An early-stage case may only allow a short message. Asking PayPal to step in needs confirmation and PayPal permission.</p>
                <TechnicalDetails><p>PayPal checks use polling and verified dispute/reversal webhooks. The evidence PDF includes the audit head. The separate client probe was tested; the integrated Sandbox flow and webhook delivery remain pending.</p></TechnicalDetails>
                <p>In demo mode, a completed labelled demo deal lets the buyer open a demo PayPal case and try the bridge without keys. The owner tested the PayPal connection separately in the Sandbox. The complete app flow has been checked with test clients and local simulation. Its real Sandbox run and delivery of PayPal’s automatic updates still need testing.</p>
              </div>
            </details>
          </Card>
        </section>

        <section aria-labelledby="evaluation-title">
          <h2 id="evaluation-title" className="mb-3 text-xl font-bold text-heading">How we tested it</h2>
          <Card className="info-card space-y-3">
            <p>We tested Creident on made-up cases, including tricks hidden in the evidence. These results use recorded AI answers, so they check our rules and test setup, not a live AI.</p>
            <Link href="/fairness" className="inline-flex min-h-11 items-center font-semibold text-heading underline">See the test results</Link>
          </Card>
        </section>

        <section id="limitations" aria-labelledby="limitations-title">
          <h2 id="limitations-title" className="mb-3 text-xl font-bold text-heading">What this demo is not</h2>
          <Card className="info-card">
            <p className="font-semibold text-heading">Demo only. No real money, no real sign-in, no seller payout. This is not a service that holds your money.</p>
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
