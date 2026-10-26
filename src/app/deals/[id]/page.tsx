import { PartialRefundNotice } from '../../../components/PartialRefundNotice';
import { SuccessBurst } from '../../../components/motion';
import { recentSuccess, activityFeed } from '../../../components/view';
import { PayPalDisputePanel } from '../../../components/PayPalDisputePanel';
import { CourierClaimPack } from '../../../components/OutboundDrafts';
import { ActivityFeed } from '../../../components/ActivityFeed';
import { notFound } from 'next/navigation';
import { ButtonLink, KeyValue, StatusPill, Timeline } from '../../../components/ui';
import { AppShell, Card, Notice, PageHeader } from '../../../components/layout';
import { ActionButton, CopyLinkButton, ReturnForm, ShipForm } from '../../../components/client';
import { DisputeSteps } from '../../../components/DisputeSteps';
import { authorizationWindow, isSimulatedDeal, money, shortDate, nextAction, shortHash, timelineFor } from '../../../components/view';
import { data, getRole, isUuid, simulatedPayPal, reviewerUnlocked } from '../../_server';
import { DealDisclosure } from '../../../components/DealDisclosure';
import { DealSecondary } from '../../../components/DealSecondary';
import { DealDecisionSummary } from '../../../components/DealDecisionSummary';
import { transactionRow } from '../../../components/transactionsView';
import { TERMS_TEMPLATES } from '../../../lib/termsTemplates';

export const dynamic = 'force-dynamic';

export default async function DealPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const ctx = data();
  const tx = ctx.repo.loadTransaction(id);
  if (!tx) notFound();
  const role = await getRole();
  const now = ctx.now();
  const created = (await searchParams).created === '1';
  const simulated = isSimulatedDeal(tx);
  const decision = ctx.repo.loadDecisions(id).at(-1);
  const recommendation = decision ? ctx.repo.loadRecommendation(id) : null;
  const paypalCases = ctx.repo.listPayPalDisputes(id);
  const allEvents = ctx.repo.readEvents(id);
  const authorizedAt = allEvents.find((e) => e.type === 'BUYER_APPROVED')?.ts;
  const authWindow = authorizedAt && !tx.captured && tx.paypalAuthId && !['VOIDED', 'CANCELLED', 'REFUNDED', 'COMPLETED'].includes(tx.status)
    ? authorizationWindow(authorizedAt, now) : null;
  const disputeType = allEvents.find((e) => e.type === 'OPEN_DISPUTE')?.payload.disputeType;
  const lastEvent = allEvents.at(-1);
  const captureFailed = lastEvent?.type === 'PAYPAL_ERROR' && lastEvent.payload.effect === 'PAYPAL_CAPTURE' && !tx.captured;
  const events = tx.captured && tx.trackingNumber ? ctx.repo.readEvents(id) : [];
  const trackingOnPayPal = !tx.captured || !tx.trackingNumber ? null
    : events.some((e) => e.type === 'PAYPAL_TRACKING_ADDED') ? (simulated ? 'Shared (demo)' : 'Shared')
    : events.some((e) => e.type === 'PAYPAL_TRACKING_FAILED') ? 'Not shared yet, trying again'
    : 'Not shared yet';
  const terms = JSON.parse(tx.termsJson) as Record<string, unknown>;
  const criteria = Array.isArray(terms.criteria) ? terms.criteria as string[] : [];
  const accepted = tx.status === 'DRAFT' ? ctx.repo.listAcceptances(id) : [];
  const action = nextAction(tx.status, role) === 'accept-terms' && accepted.includes(role as 'buyer' | 'seller') ? 'none' : nextAction(tx.status, role);
  const view = transactionRow(tx, role, now, accepted);
  const waiting = (['buyer', 'seller', 'reviewer'] as const).filter(other => other !== role)
    .map(other => ({ other, row: transactionRow(tx, other, now, accepted) }))
    .filter(({ row }) => row.needsAction)
    .map(({ other, row }) => `${other[0]!.toUpperCase()}${other.slice(1)}: ${row.nextStep}`);

  return (
    <AppShell active="Deals">
      <div className="deal-story">
      {(() => { const label = recentSuccess(tx.status, allEvents.at(-1)?.ts, ctx.now()); return label ? <SuccessBurst storageKey={`${id}:${tx.status}`} label={label}/> : null; })()}
      <PageHeader title={tx.item} subtitle={`Deal #${id.slice(0, 8).toUpperCase()}`} back="/deals"/>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Card className="deal-summary space-y-2">
            <p className="text-sm font-semibold text-heading">{tx.item}</p>
            <p className="font-display text-[32px] font-extrabold tracking-tight text-heading tabular-nums">{money(tx.amount, tx.currency)}</p>
            <StatusPill status={tx.status}/>
            {view.deadlineLabel && <p className="text-sm text-muted">Time left: {view.deadlineLabel}</p>}
            {(simulated || view.demo || simulatedPayPal()) && <p className="text-sm font-semibold" style={{ color: 'var(--warning-text)' }}>Demo payment · no real money</p>}
          </Card>
          <section id="next-step" aria-labelledby="next-step-title" data-next-action={action} className="deal-card scroll-mt-6 space-y-3">
            <h2 id="next-step-title" className="text-lg text-heading">Your next step</h2>
          {action === 'accept-terms' && (role === 'buyer'
            ? <ButtonLink href={`/deals/${id}/checkout`} fullWidth>Review terms & pay</ButtonLink>
            : <ActionButton path={`/api/transactions/${id}/accept`} role={role} label="Accept terms" fullWidth/>)}
          {action === 'pay' && <ButtonLink href={`/deals/${id}/checkout`} fullWidth>Review & pay</ButtonLink>}
          {action === 'wait-approval' && <Notice>Waiting for your approval on PayPal (Sandbox). If you closed the PayPal window, start again from the checkout screen after it expires.</Notice>}
          {action === 'ship' && <ShipForm txId={id}/>}
          {action === 'confirm-or-dispute' && (
            <div className="space-y-3">
              <ActionButton path={`/api/transactions/${id}/confirm`} role="buyer" label="Confirm receipt" fullWidth confirm={{
                title: 'Confirm you received the item', amount: money(tx.amount, tx.currency), amountCaption: tx.item,
                rows: [{ label: 'Payment', value: 'Completed via PayPal' }, { label: 'Problems', value: 'Can no longer be reported here' }],
                note: 'Only confirm after you checked the item against the locked terms.', confirmLabel: 'Confirm receipt',
              }}/>
              <div className="border-t border-line pt-4"><DisputeSteps txId={id} evidenceWindow={`${ctx.time.evidenceDays} day${ctx.time.evidenceDays === 1 ? '' : 's'}`}/></div>
            </div>
          )}
          {action === 'add-evidence' && <ButtonLink href={`/deals/${id}/evidence`} fullWidth>Add evidence</ButtonLink>}
          {action === 'ship-return' && <ReturnForm txId={id}/>}
          {tx.status === 'RETURN_REQUESTED' && <Notice>A reviewer decided to refund the buyer once the item is back with the seller. The buyer has until the deadline to ship it back; if no delivered return is recorded by then, the payment goes to the seller.</Notice>}
          {action === 'review' && <ButtonLink href={`/deals/${id}/review`} fullWidth>Review dispute</ButtonLink>}
          {tx.status === 'DRAFT' && <Notice>Accepted so far: {accepted.length ? accepted.join(' and ') : 'nobody'}. Terms lock when both buyer and seller accept.</Notice>}
          {action === 'none' && <div className="space-y-2">
            <p className="text-sm">{tx.status === 'FROZEN_EXTERNAL' ? 'PayPal is reviewing a case on this payment. Nothing moves until PayPal closes it.'
              : waiting.length ? `Waiting for ${waiting.join(' · ')}` : view.nextStep}</p>
            {waiting.length > 0 && <p className="text-sm text-muted">Nothing to do for your role right now. Switch role in Settings to act as another party.</p>}
          </div>}

            {captureFailed && <Notice tone="warning">PayPal could not charge this payment ({String(lastEvent!.payload.code ?? 'error')}{lastEvent!.payload.issue ? `: ${String(lastEvent!.payload.issue)}` : ''}). The payment approval may be older than 3 days, so PayPal may decline a later charge. Nothing was charged and the deal status has not changed. This prototype does not renew payment approval automatically.</Notice>}
            <PartialRefundNotice tx={tx} events={allEvents}/>
          </section>
          {decision && <DealDecisionSummary tx={tx} decision={decision} recommendation={recommendation} events={allEvents}/>}
          <Card><h2 className="mb-4 text-lg text-heading">Progress</h2><Timeline steps={timelineFor(tx.status, tx.frozenFrom)} showCurrentLabel/></Card>
          <ActivityFeed txId={id} items={activityFeed(allEvents)} now={now}/>
        </div>

        <DealSecondary>
          {created && role === 'seller' && <Card className="space-y-3"><Notice>Deal created and your terms are accepted. Share the link with the buyer; they accept and pay on the checkout screen.</Notice><CopyLinkButton path={`/deals/${id}/checkout`}/></Card>}
          <DealDisclosure title="Locked terms">
          <KeyValue items={[
            ...(typeof terms.category === 'string' && TERMS_TEMPLATES.some((t) => t.id === terms.category) ? [{ label: 'Item type', value: TERMS_TEMPLATES.find((t) => t.id === terms.category)!.label }] : []),
            { label: 'Condition', value: String(terms.condition ?? '—') },
            ...(Array.isArray(terms.includedItems) ? [{ label: 'Included items', value: terms.includedItems.filter((item): item is string => typeof item === 'string').join(', ') }] : []),
            ...(terms.description ? [{ label: 'Description', value: String(terms.description) }] : []),
            ...criteria.map((c, i) => ({ label: `Check ${i + 1}`, value: c })),
            { label: 'Terms fingerprint', value: <span className="font-mono text-sm">{shortHash(tx.termsHash, 6)}</span> },
            ...(tx.trackingNumber ? [{ label: 'Tracking (demo courier)', value: tx.trackingNumber }] : []),
          ]}/>
          </DealDisclosure>
          <DealDisclosure title="Fees & payment details">
          <KeyValue items={[
            { label: 'PayPal fee', value: simulated ? 'None (demo)' : tx.captured ? 'See PayPal' : 'Shown after payment' },
            ...(authWindow ? [{ label: 'Payment approval', value: authWindow.phase === 'honor' ? `Initial 3-day window ends ${shortDate(authWindow.honorEndsAt)}` : authWindow.phase === 'after-honor' ? `Past the initial 3-day window; charging may fail (expires ${shortDate(authWindow.expiresAt)})` : 'Expired: can no longer be charged' }] : []),
            { label: 'Refund fees paid by', value: 'The platform (buyer gets the full refund amount)' },
            ...(trackingOnPayPal ? [{ label: 'Tracking on PayPal', value: trackingOnPayPal }] : []),
          ]}/>
          </DealDisclosure>
          {(tx.captured || paypalCases.length > 0) && <div className="deal-paypal">
            <PayPalDisputePanel tx={tx} cases={paypalCases} role={role} simulatedMode={simulatedPayPal()} reviewerAllowed={role !== 'reviewer' || await reviewerUnlocked()}/>
          </div>}
          {role === 'seller' && disputeType === 'damaged' && <Card><h2 className="mb-3 text-lg text-heading">Courier claim</h2><CourierClaimPack txId={id}/></Card>}
          <Card className="space-y-2">
            <ButtonLink href={`/audit/${id}`} variant="ghost" fullWidth>Deal record</ButtonLink>
            <p className="text-center text-sm text-muted">Every step is saved in the deal record.</p>
          </Card>
        </DealSecondary>
      </div>
      </div>
    </AppShell>
  );
}
