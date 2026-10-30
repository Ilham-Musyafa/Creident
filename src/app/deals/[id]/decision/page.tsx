import { displayItemName } from '../../../../components/displayItemName';
import { TechnicalDetails } from '../../../../components/TechnicalDetails';
import { RuleLabel } from '../../../../components/RuleLabel';
import { decisionOutcomeLabel } from '../../../../components/decisionCopy';
import { PAYMENT_ACTION_LABELS, AI_REVIEW_NOTE, evidenceLabel } from '../../../../components/presentationCopy';
import { PartialRefundNotice } from '../../../../components/PartialRefundNotice';
import { SuccessBurst } from '../../../../components/motion';
import { PrintButton } from '../../../../components/PrintButton';
import { recentSuccess } from '../../../../components/view';
import { decisionBasis } from '../../../../lib/decisionBasis';
import { notFound } from 'next/navigation';
import { ButtonLink, KeyValue, StatusPill } from '../../../../components/ui';
import { AppShell, Card, EmptyState, Notice, PageHeader, SectionTitle } from '../../../../components/layout';
import { isSimulatedDeal, money, shortDate } from '../../../../components/view';
import { verifyChain } from '../../../../lib/audit/chain';
import { data, isUuid, sha256 } from '../../../_server';

export const dynamic = 'force-dynamic';

const RULE_ACTION = PAYMENT_ACTION_LABELS;

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
  const outcomeText = decision ? decisionOutcomeLabel(tx, decision, events) : '';

  return (
    <AppShell active="Deals">
      {(() => { const label = recentSuccess(tx.status, events.at(-1)?.ts, ctx.now()); return label ? <SuccessBurst storageKey={`${id}:${tx.status}`} label={label}/> : null; })()}
      <PageHeader title="Decision receipt" back={`/deals/${id}`} subtitle={`${displayItemName(tx.item)} · ${money(tx.amount, tx.currency)}`} right={<StatusPill status={tx.status}/>}/>
      {!decision ? (
        <EmptyState title="No dispute decision on this deal">A receipt appears here after a reviewer decides a dispute.</EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <PartialRefundNotice tx={tx} events={events}/>
            <Card className="relative overflow-hidden">
              {/* Bank-style receipt header: reference, date and a save action (docs/UI.md). */}
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-line pb-4">
                <div className="min-w-0">
                  <p className="text-sm text-muted">Decision recorded</p>
                  <p className="mt-1 text-sm text-muted">{shortDate(decision.createdAt)} · {money(tx.amount, tx.currency)}</p>
                </div>
                <PrintButton/>
              </div>
              <p className="text-sm text-muted">Outcome</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-heading">{outcomeText}</p>
              {isSimulatedDeal(tx) && <p className="mt-1 text-sm text-muted">Demo payment · no real money</p>}
              {tx.status === 'RETURN_REQUESTED' && <p className="mt-1 text-sm text-muted">{tx.captured ? 'The payment was already charged. The refund waits for the required return.' : 'No money has moved yet. The refund runs when the return reaches the seller.'}</p>}
              {decision.amount && <p className="mt-3 text-sm font-semibold text-heading">Reviewer refund amount: {money(decision.amount, tx.currency)} {tx.currency}</p>}
              <p className="mt-4 text-sm text-muted">Reviewer's reason</p>
              <p className="mt-1 text-sm text-text">{decision.reason}</p>
              <p className="mt-2 text-sm text-muted">Decided by the demo reviewer · {shortDate(decision.createdAt)}</p>
            </Card>

            <div>
              <SectionTitle>What the rules recommended</SectionTitle>
              <KeyValue items={[
                { label: 'Rule', value: <RuleLabel rule={rec?.ruleId ?? 'NONE'}/> },
                { label: 'Recommendation', value: rec ? RULE_ACTION[rec.action] ?? 'Recommendation unavailable' : '—' },
                { label: 'AI summary', value: rec?.aiSummary ? `${rec.aiSummary.findings.length} findings` : 'Not available' },
                { label: 'Reviewer followed it', value: rec ? (rec.action === decision.outcome ? 'Yes' : rec.action === 'ESCALATE_HUMAN' ? 'A person decided, as the rules asked' : 'No, see reason') : '—' },
              ]}/>
            </div>

            <div>
              <SectionTitle>Current evidence ({evidence.length})</SectionTitle>
              <div className="space-y-2">
                {evidence.map((e, i) => (
                  <Card key={e.id}>
                    <p className="text-sm font-semibold text-muted">{evidenceLabel(e.submittedBy, evidence.slice(0, i + 1).filter(item => item.submittedBy === e.submittedBy).length)} · <span className="capitalize">{e.kind} · {e.submittedBy}</span></p>
                    <p className="mt-1 text-sm">{e.content}</p>
                    <TechnicalDetails><p>SHA-256: <span className="break-all font-mono">{sha256(e.content)}</span></p><p>Evidence ID: <span className="break-all font-mono">{e.id}</span></p></TechnicalDetails>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-3">
            <SectionTitle>On the record</SectionTitle>
            <KeyValue items={[
              { label: 'Terms check', value: verification(recordedTermsHash, currentBasis.termsHash) },
              { label: 'Evidence check', value: verification(recordedEvidenceDigest, currentBasis.evidenceDigest) },
              { label: 'Record check', value: chain.ok ? `Verified on this server, ${events.length} steps` : 'Changed after recording' },
              ...(decisionEvent?.payload.evidenceChangedSinceRecommendation === true ? [{ label: 'Evidence after the recommendation', value: 'Changed before the decision' }] : []),
            ]}/>
            <TechnicalDetails><KeyValue items={[
              { label: 'Receipt reference', value: `CR-${id.slice(0, 8).toUpperCase()}-${decisionEvent?.seq ?? 0}` },
              { label: 'Deal ID', value: <span className="break-all font-mono">{id}</span> },
              { label: 'Recorded payment effect', value: String(moneyEvent?.payload.effect ?? 'None recorded') },
              { label: 'Terms fingerprint at decision', value: <span className="block max-w-[180px] break-all font-mono text-sm">{typeof recordedTermsHash === 'string' ? recordedTermsHash : 'Not recorded'}</span> },
              { label: 'Evidence fingerprint at decision', value: <span className="block max-w-[180px] break-all font-mono text-sm">{typeof recordedEvidenceDigest === 'string' ? recordedEvidenceDigest : 'Not recorded'}</span> },
              { label: 'Decision step', value: decisionEvent ? `#${decisionEvent.seq}` : '—' },
              { label: 'Step fingerprint', value: <span className="font-mono text-sm">{decisionEvent ? decisionEvent.hash : '—'}</span> },
            ]}/></TechnicalDetails>
            <ButtonLink href={`/audit/${id}`} variant="ghost" fullWidth>Open deal record</ButtonLink>
            <Notice>{AI_REVIEW_NOTE} The reason above is recorded with the decision. Record checks help reveal changes to saved steps.</Notice>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
