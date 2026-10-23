import { AppShell, Card, PageHeader, SectionTitle } from '../../components/layout';
import { BrandLogo } from '../../components/BrandLogo';

const RULES = [
  ['R1', 'No tracking before the ship-by deadline: the authorization is voided. No money moves.'],
  ['R2', 'Delivered to the agreed address and the buyer confirmed or stayed silent through inspection: release.'],
  ['R3', 'Tracking does not fit the order (other destination or impossible ship date): a human reviews.'],
  ['R4', 'In a dispute, every criterion clearly supports one side with evidence: a recommendation, confirmed by a human.'],
  ['R5', 'Missing, unclear or mixed evidence, no usable AI summary, or damage / missing-parts disputes: a human decides regardless of the summary.'],
  ['R6', 'A matching PayPal dispute poll or verified dispute/reversal webhook freezes the deal. Resolution resumes the prior local state; the financial outcome needs a separate check.'],
  ['R7', 'Evidence looks like instructions aimed at the AI: the text is ignored for scoring and a human reviews.'],
];

export default function AboutPage() {
  return (
    <AppShell active="Menu">
      <PageHeader title="About Creident" back="/menu" subtitle="A dispute-mediation prototype for peer-to-peer sales, built for the PayPal AI Hackathon 2026."/>
      <div className="mb-4 rounded-[22px] border border-line bg-surface p-3"><BrandLogo/></div>
      <div className="mx-auto max-w-2xl space-y-2 text-sm leading-relaxed">
        <SectionTitle><span id="decisions">How decisions are made</span></SectionTitle>
        <Card>
          <p>Terms are locked before payment. PayPal only authorizes the funds; capture, void and refund happen when deterministic rules allow it. The AI summarises the evidence against the agreed criteria. It has no tools and cannot release or refund.</p>
          <ul className="mt-3 space-y-2">{RULES.map(([id, text]) => <li key={id} className="flex gap-3"><span className="font-mono text-xs font-bold text-heading">{id}</span><span>{text}</span></li>)}</ul>
        </Card>

        <SectionTitle><span id="audit">Audit & verification</span></SectionTitle>
        <Card><p>Every action is recorded in an append-only, hash-chained log per deal. Verification checks event content, sequence and links. The operator can still rewrite the database and recompute a chain. Signed checkpoints make later rewriting detectable to someone holding a published checkpoint and its trusted public key; publishing is manual.</p></Card>

        <SectionTitle>PayPal dispute bridge</SectionTitle>
        <Card>
          <p>A reviewer can check PayPal cases, and the deadline tick polls too; there is no background worker. Verified webhooks also freeze matching deals. Seller or reviewer can send a text PDF of locked terms, audited evidence, tracking, any decision and the audit head when PayPal offers evidence submission. Inquiry may only allow a short message; escalation to a claim needs confirmation and PayPal permission.</p>
          <p className="mt-3">In simulated mode, a completed labelled demo deal lets the buyer open a simulated PayPal case and try the bridge without keys. The owner tested the separate client probe in the Sandbox; the integrated bridge has fake-client and local-simulation checks. Its real Sandbox run and real webhook delivery remain pending.</p>
        </Card>

        <SectionTitle>Evaluation status</SectionTitle>
        <Card>
          <p>The committed replay run has 50 synthetic cases: 10 labels individually reviewed by the owner and 40 drafts accepted without individual review. It escalates 23/50 cases; no base result differs from its label. Recorded summaries were authored from the original draft labels, so this checks the harness and rules, not a live model. See Fairness results for sample sizes and all metrics.</p>
        </Card>

        <SectionTitle><span id="limitations">Limitations</span></SectionTitle>
        <Card>
          <ul className="list-disc space-y-1 pl-5">
            <li>PayPal Sandbox only. No real money. USD only.</li>
            <li>A dispute-mediation prototype, not an escrow service. A real launch needs an appropriately authorized payment partner, regulatory review and PayPal approval where required.</li>
            <li>Courier tracking is simulated. Seller payout is not implemented: release means capture into the Sandbox merchant account. Demo deals use simulated PayPal payments.</li>
            <li>Demo roles replace real sign-in.</li>
            <li>Evidence is text, including descriptions labelled as photos; camera capture and file upload are not built. Photo authenticity is not verified.</li>
            <li>On a refund the platform bears the PayPal fee; the buyer is refunded in full.</li>
            <li>A refund waits for the item to be returned to the seller, unless the reviewer waives it (for example the item never arrived).</li>
            <li>The operator still runs the server; the audit log and signed checkpoints make its actions checkable, not impossible to misuse.</li>
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
