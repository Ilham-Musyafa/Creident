import { notFound } from 'next/navigation';
import { ButtonLink, KeyValue, StatusPill } from '../../../../components/ui';
import { AppShell, Card, EmptyState, Notice, PageHeader, SectionTitle } from '../../../../components/layout';
import { isSimulatedDeal, money, shortDate, shortHash } from '../../../../components/view';
import { verifyChain } from '../../../../lib/audit/chain';
import { data, isUuid, sha256 } from '../../../_server';

export const dynamic = 'force-dynamic';

const OUTCOME: Record<string, string> = {
  RELEASE: 'Released to the seller', REFUND: 'Refunded to the buyer', SPLIT: 'Split (pending: no money moved yet)',
};
const MONEY_STEP: Record<string, string> = {
  PAYPAL_CAPTURE: 'Payment captured on PayPal', PAYPAL_VOID: 'Authorization voided on PayPal (nothing was charged)',
  PAYPAL_REFUND: 'Captured payment refunded on PayPal',
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
  const chain = verifyChain(events);
  const moneyStep = decisionEvent ? MONEY_STEP[String(decisionEvent.payload.effect ?? '')] : undefined;

  return (
    <AppShell active="Deals">
      <PageHeader title="Decision receipt" back={`/deals/${id}`} subtitle={`${tx.item} · ${money(tx.amount, tx.currency)}`} right={<StatusPill status={tx.status}/>}/>
      {!decision ? (
        <EmptyState title="No dispute decision on this deal">A receipt appears here after a reviewer decides a dispute.</EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Card>
              <p className="text-xs text-muted">Outcome</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-heading">{OUTCOME[decision.outcome] ?? decision.outcome}</p>
              {moneyStep && <p className="mt-1 text-sm text-muted">{moneyStep}{isSimulatedDeal(tx) ? ' (simulated)' : ''}</p>}
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
              <SectionTitle>Evidence considered ({evidence.length})</SectionTitle>
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
              { label: 'Terms hash', value: <span className="font-mono text-xs">{shortHash(tx.termsHash ?? '', 6)}</span> },
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
