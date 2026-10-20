import { AppShell, Card, PageHeader, SectionTitle } from '../../components/layout';

const RULES = [
  ['R1', 'No tracking before the ship-by deadline: the authorization is voided. No money moves.'],
  ['R2', 'Delivered to the agreed address and the buyer confirmed or stayed silent through inspection: release.'],
  ['R3', 'Tracking does not fit the order (other destination or impossible ship date): a human reviews.'],
  ['R4', 'In a dispute, every criterion clearly supports one side with evidence: a recommendation, confirmed by a human.'],
  ['R5', 'Missing, unclear or mixed evidence, or no AI summary: a human decides.'],
  ['R6', 'A PayPal dispute or reversal is open: the deal is frozen and PayPal’s outcome prevails.'],
  ['R7', 'Evidence looks like instructions aimed at the AI: the text is ignored for scoring and a human reviews.'],
];

export default function AboutPage() {
  return (
    <AppShell active="Menu">
      <PageHeader title="About HalcyVault" back="/menu" subtitle="A dispute-mediation prototype for peer-to-peer sales, built for the PayPal AI Hackathon 2026."/>
      <div className="mx-auto max-w-2xl space-y-2 text-sm leading-relaxed">
        <SectionTitle><span id="decisions">How decisions are made</span></SectionTitle>
        <Card>
          <p>Terms are locked before payment. PayPal only authorizes the funds; capture, void and refund happen when deterministic rules allow it. The AI summarises the evidence against the agreed criteria. It has no tools and cannot release or refund.</p>
          <ul className="mt-3 space-y-2">{RULES.map(([id, text]) => <li key={id} className="flex gap-3"><span className="font-mono text-xs font-bold text-heading">{id}</span><span>{text}</span></li>)}</ul>
        </Card>

        <SectionTitle><span id="audit">Audit & verification</span></SectionTitle>
        <Card><p>Every action is recorded in an append-only, hash-chained log per deal. Editing, deleting or reordering an event breaks the chain. The operator still holds the database and the PayPal keys, so this makes tampering detectable, not impossible.</p></Card>

        <SectionTitle><span id="limitations">Limitations</span></SectionTitle>
        <Card>
          <ul className="list-disc space-y-1 pl-5">
            <li>PayPal Sandbox only. No real money. USD only.</li>
            <li>Not a licensed escrow service. A real launch would need a licensed partner and PayPal pre-approval.</li>
            <li>Courier tracking and seller payouts are simulated. Demo deals use a simulated PayPal.</li>
            <li>Demo roles replace real sign-in.</li>
            <li>Fake photos may not be detected. Evaluation results are indicative, based on synthetic cases.</li>
            <li>On a refund the platform bears the PayPal fee; the buyer is refunded in full.</li>
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
