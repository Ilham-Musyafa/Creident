import { EvidenceTranslation } from '../../../../components/EvidenceTranslation';
import { SuccessBurst } from '../../../../components/motion';
import { recentSuccess } from '../../../../components/view';
import { PartialRefundNotice } from '../../../../components/PartialRefundNotice';
import { PayPalDisputePanel } from '../../../../components/PayPalDisputePanel';
import { notFound } from 'next/navigation';
import { FindingCard, KeyValue, RuleNotice, StatusPill } from '../../../../components/ui';
import { AppShell, Card, EmptyState, Notice, PageHeader, SectionTitle } from '../../../../components/layout';
import { ReviewDecision } from '../../../../components/ReviewDecision';
import { money } from '../../../../components/view';
import { data, getRole, isUuid, reviewerUnlocked, simulatedPayPal, sha256 } from '../../../_server';
import { disputeType } from '../../../../lib/disputeTypes';

export const dynamic = 'force-dynamic';

const ACTION_TEXT: Record<string, string> = {
  RELEASE: 'Release to seller', REFUND: 'Refund to buyer', VOID: 'Void the authorization',
  ESCALATE_HUMAN: 'Escalate to a human', FREEZE: 'Freeze', WAIT: 'Wait',
};

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const ctx = data();
  const tx = ctx.repo.loadTransaction(id);
  if (!tx) notFound();
  const role = await getRole();
  const translateAllowed = role === 'reviewer' && await reviewerUnlocked();
  const rec = ctx.repo.loadRecommendation(id);
  const pendingSplit = ctx.repo.hasPendingSplit(id);
  const evidence = ctx.repo.loadEvidence(id);
  const ruleId = rec && rec.ruleId !== 'NONE' ? rec.ruleId : null;
  const dtype = disputeType(ctx.repo.readEvents(id).find((e) => e.type === 'OPEN_DISPUTE')?.payload.disputeType);
  // Same B1/S1 aliases as the copilot; stored findings still use their original ids.
  const label = new Map((['buyer', 'seller'] as const).flatMap(side => evidence.filter(e => e.submittedBy === side).map((e, i) => [e.id, `${side === 'buyer' ? 'B' : 'S'}${i + 1}`] as const)));

  return (
    <AppShell active="Deals">
      {(() => { const label = recentSuccess(tx.status, ctx.repo.readEvents(id).at(-1)?.ts, ctx.now()); return label ? <SuccessBurst storageKey={`${id}:${tx.status}`} label={label}/> : null; })()}
      <PageHeader title="Dispute review" back={`/deals/${id}`} subtitle={`${tx.item} · ${money(tx.amount)}`} right={<StatusPill status={tx.status}/>}/>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <SectionTitle>AI evidence summary</SectionTitle>
          {!rec ? <EmptyState title="No recommendation yet">It is prepared when the deal enters review.</EmptyState>
            : !rec.aiSummary ? <Notice tone="warning">No AI summary is available (the AI was unavailable, returned invalid output, or there was too little evidence). A human decides.</Notice>
            : <div className="space-y-2">{rec.aiSummary.findings.map((f) => <FindingCard key={f.criterion} criterion={f.criterion} supports={f.supports} evidenceIds={f.evidenceIds.map((ref) => label.get(ref) ?? ref)}/>)}</div>}
          {ruleId && <div className="mt-3"><RuleNotice rule={ruleId} reason={`${ACTION_TEXT[rec!.action] ?? rec!.action}${rec!.requiresHuman ? ' · needs a human decision' : ''}`}/></div>}
          {rec && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted">{rec.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
          <SectionTitle>Evidence ({evidence.length})</SectionTitle>
          <div className="space-y-2">{evidence.map((e) => <Card key={e.id}><p className="text-xs font-semibold text-muted">{label.get(e.id)} · <span className="capitalize">{e.kind} · {e.submittedBy}</span></p><p className="mt-1 text-sm [overflow-wrap:anywhere]">{e.content}</p>{translateAllowed && <EvidenceTranslation key={sha256(e.content)} txId={id} evidenceId={e.id} sourceHash={sha256(e.content)}/>}</Card>)}</div>
        </div>
        <aside className="min-w-0 space-y-3">
          <PayPalDisputePanel tx={tx} cases={ctx.repo.listPayPalDisputes(id)} role={role} simulatedMode={simulatedPayPal()} reviewerAllowed={role !== 'reviewer' || await reviewerUnlocked()}/>
          <PartialRefundNotice tx={tx} events={ctx.repo.readEvents(id)}/>
          <SectionTitle>Decision</SectionTitle>
          <KeyValue items={[
            { label: 'Rule', value: rec ? rec.ruleId : '—' },
            { label: 'Recommended', value: rec ? ACTION_TEXT[rec.action] ?? rec.action : '—' },
            { label: 'Human required', value: rec ? (rec.requiresHuman ? 'Yes' : 'No') : '—' },
            ...(dtype ? [{ label: 'Dispute type', value: dtype.label }] : []),
          ]}/>
          {role !== 'reviewer' ? <Notice>Only the reviewer decides. Switch to Reviewer in Menu.</Notice>
            : !(await reviewerUnlocked()) ? <Notice tone="warning">This demo needs the reviewer access code. Enter it in Menu.</Notice>
            : tx.partialRefundAmount ? <Notice>A partial refund decision is already recorded. Check the decision receipt and payment status.</Notice>
            : tx.status !== 'UNDER_REVIEW' ? <Notice>This deal is not under review.</Notice>
            : <Card><ReviewDecision dealAmount={tx.amount} txId={id} pendingSplit={pendingSplit} returnByDefault={dtype?.id !== 'not_received'}/></Card>}
          <Notice>The AI only summarises; it cannot release or refund. Rules recommend, and a human confirms every dispute outcome.</Notice>
        </aside>
      </div>
    </AppShell>
  );
}
