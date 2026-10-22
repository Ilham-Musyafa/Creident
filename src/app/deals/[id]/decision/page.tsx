import { PartialRefundNotice } from '../../../../components/PartialRefundNotice';
import { SuccessBurst } from '../../../../components/motion';
import { recentSuccess } from '../../../../components/view';
import { decisionBasis } from '../../../../lib/decisionBasis';
import { notFound } from 'next/navigation';
import { ButtonLink, KeyValue, StatusPill } from '../../../../components/ui';
import { AppShell, Card, EmptyState, Notice, PageHeader, SectionTitle } from '../../../../components/layout';
import { isSimulatedDeal, money, shortDate, shortHash } from '../../../../components/view';
import { verifyChain } from '../../../../lib/audit/chain';
import { data, isUuid, sha256 } from '../../../_server';

export const dynamic = 'force-dynamic';

const OUTCOME: Record<string, string> = {
  RELEASE: 'Released to the seller', REFUND: 'Refunded to the buyer', SPLIT: 'Split (pending: no money moved yet)', PARTIAL_REFUND: 'Partial refund decided',
};
const MONEY_STEP: Record<string, string> = {
  PAYPAL_CAPTURE: 'Payment captured on PayPal', PAYPAL_VOID: 'Authorization voided on PayPal (nothing was charged)',
  PAYPAL_REFUND: 'Captured payment refunded on PayPal', PAYPAL_PARTIAL_REFUND: 'Reviewer amount refunded on PayPal',
};
const RULE_ACTION: Record<string, string> = {
  RELEASE: 'Release', REFUND: 'Refund', VOID: 'Void', ESCALATE_HUMAN: 'Escalate to a human', FREEZE: 'Freeze', WAIT: 'Wait',
};

// One page both parties can read after a dispute: what was decided, by whom, on which rule
// and evidence, and where it sits in the hash-chained audit log.
export default async function DecisionReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const ctx = data();
  const tx = ctx.repo.loadTransaction(id);
  if (!tx) notFound();
  const decisions = ctx.repo.loadDecisions(id);
  const decision = decisions.at(-1);
  const events = ctx.repo.readEvents(id);
  const decisionEvent = [...events].reverse().find((e) => e.type === 'DECISION' || e.type === 'HUMAN_SPLIT_PENDING');
  const rec = ctx.repo.loadRecommendation(id);
  const evidence = ctx.repo.loadEvidence(id);
  const currentBasis = decisionBasis(tx.termsJson, evidence);
  const recordedTermsHash = decisionEvent?.payload.termsHash;
  const recordedEvidenceDigest = decisionEvent?.payload.evidenceDigest;
  const verification = (recorded: unknown, current: string) => typeof recorded === 'string'
    ? recorded === current ? 'Matches' : 'Changed since decision' : 'Not recorded';
  const chain = verifyChain(events);
  // The money can move at the decision, or later when a required return arrives or is not made.
  const moneyEvent = [...events].reverse().find((e) => ['DECISION', 'RETURN_DELIVERED', 'RETURN_DEADLINE_PASSED', 'PARTIAL_REFUND_CAPTURED', 'PARTIAL_REFUND_COMPLETED'].includes(e.type) && e.payload.effect && e.payload.effect !== 'NONE');
  const moneyStep = moneyEvent ? MONEY_STEP[String(moneyEvent.payload.effect ?? '')] : undefined;
  const outcomeText = decision?.outcome === 'PARTIAL_REFUND'
    ? tx.partialRefundState === 'completed' ? `Partially refunded ${money(decision.amount ?? tx.partialRefundAmount ?? '0.00')}`
    : tx.partialRefundState === 'cancelled' ? 'Partial refund not executed: item not returned in time'
    : tx.status === 'RETURN_REQUESTED' ? 'Partial refund after the item is returned' : 'Partial refund pending'
    : !decision ? '' : decision.outcome !== 'REFUND' ? OUTCOME[decision.outcome] ?? decision.outcome
    : tx.status === 'RETURN_REQUESTED' ? 'Refund after the item is returned'
    : moneyEvent?.type === 'RETURN_DEADLINE_PASSED' ? 'Released to the seller: item not returned in time'
    : moneyEvent?.type === 'RETURN_DELIVERED' ? 'Refunded to the buyer after the return'
    : OUTCOME.REFUND;

  return (
    <AppShell active="Deals">
      {(() => { const label = recentSuccess(tx.status, events.at(-1)?.ts, ctx.now()); return label ? <SuccessBurst storageKey={`${id}:${tx.status}`} label={label}/> : null; })()}
      <PageHeader title="Decision receipt" back={`/deals/${id}`} subtitle={`${tx.item} · ${money(tx.amount, tx.currency)}`} right={<StatusPill status={tx.status}/>}/>
      {!decision ? (
        <EmptyState title="No dispute decision on this deal">A receipt appears here after a reviewer decides a dispute.</EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <PartialRefundNotice tx={tx} events={events}/>
            <Card>
              <p className="text-xs text-muted">Outcome</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-heading">{outcomeText}</p>
              {moneyStep && <p className="mt-1 text-sm text-muted">{moneyStep}{isSimulatedDeal(tx) ? ' (simulated)' : ''}</p>}
              {tx.status === 'RETURN_REQUESTED' && <p className="mt-1 text-sm text-muted">{tx.captured ? 'The earlier payment was captured. The refund waits for the required return.' : 'No money has moved yet. The refund runs when the return reaches the seller.'}</p>}
              {decision.amount && <p className="mt-3 text-sm font-semibold text-heading">Reviewer refund amount: {money(decision.amount)} USD · fee borne by Platform</p>}
              <p className="mt-4 text-xs text-muted">Reviewer's reason</p>
              <p className="mt-1 text-sm text-text">{decision.reason}</p>
              <p className="mt-2 text-xs text-muted">Decided by the demo reviewer · {shortDate(decision.createdAt)}</p>
            </Card>

            <div>
              <SectionTitle>What the rules recommended</SectionTitle>
              <KeyValue items={[
                { label: 'Rule', value: rec ? rec.ruleId : 'None recorded' },
                { label: 'Recommendation', value: rec ? RULE_ACTION[rec.action] ?? rec.action : '—' },
                { label: 'AI summary', value: rec?.aiSummary ? `${rec.aiSummary.findings.length} findings` : 'Not available' },
                { label: 'Reviewer followed it', value: rec ? (rec.action === decision.outcome ? 'Yes' : rec.action === 'ESCALATE_HUMAN' ? 'Rules asked for a human' : 'No, see reason') : '—' },
              ]}/>
            </div>

            <div>
              <SectionTitle>Current evidence ({evidence.length})</SectionTitle>
              <div className="space-y-2">
                {evidence.map((e, i) => (
                  <Card key={e.id}>
                    <p className="text-xs font-semibold text-muted">E{i + 1} · <span className="capitalize">{e.kind} · {e.submittedBy}</span></p>
                    <p className="mt-1 text-sm">{e.content}</p>
                    <p className="mt-1 break-all font-mono text-[11px] text-muted">sha256 {shortHash(sha256(e.content), 8)}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-3">
            <SectionTitle>On the record</SectionTitle>
            <KeyValue items={[
              { label: 'Terms hash at decision', value: <span className="block max-w-[180px] break-all font-mono text-xs">{typeof recordedTermsHash === 'string' ? recordedTermsHash : 'Not recorded'}</span> },
              { label: 'Current terms', value: verification(recordedTermsHash, currentBasis.termsHash) },
              { label: 'Evidence digest at decision', value: <span className="block max-w-[180px] break-all font-mono text-xs">{typeof recordedEvidenceDigest === 'string' ? recordedEvidenceDigest : 'Not recorded'}</span> },
              { label: 'Current evidence', value: verification(recordedEvidenceDigest, currentBasis.evidenceDigest) },
              ...(decisionEvent?.payload.evidenceChangedSinceRecommendation === true
                ? [{ label: 'Evidence since recommendation', value: 'Changed before decision' }] : []),
              { label: 'Decision event', value: decisionEvent ? `#${decisionEvent.seq}` : '—' },
              { label: 'Event hash', value: <span className="font-mono text-xs">{decisionEvent ? shortHash(decisionEvent.hash, 6) : '—'}</span> },
              { label: 'Audit chain', value: chain.ok ? `Verified, ${events.length} events` : 'Verification failed' },
            ]}/>
            <ButtonLink href={`/audit/${id}`} variant="ghost" fullWidth>Open audit log</ButtonLink>
            <Notice>The AI only summarised the evidence. Rules recommended, and a person made this decision with the reason above. Changing any recorded step later breaks the audit chain.</Notice>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
