import { PartialRefundNotice } from '../../../components/PartialRefundNotice';
import { SuccessBurst } from '../../../components/motion';
import { recentSuccess, activityFeed } from '../../../components/view';
import { PayPalDisputePanel } from '../../../components/PayPalDisputePanel';
import { CourierClaimPack } from '../../../components/OutboundDrafts';
import { ActivityFeed } from '../../../components/ActivityFeed';
import { notFound } from 'next/navigation';
import { ButtonLink, KeyValue, StatusPill, Timeline } from '../../../components/ui';
import { AppShell, Card, Notice, PageHeader, SectionTitle } from '../../../components/layout';
import { ActionButton, CopyLinkButton, ReturnForm, ShipForm } from '../../../components/client';
import { DisputeSteps } from '../../../components/DisputeSteps';
import { authorizationWindow, isSimulatedDeal, money, shortDate, nextAction, shortHash, timeLeft, timelineFor } from '../../../components/view';
import { data, getRole, isUuid, simulatedPayPal, reviewerUnlocked } from '../../_server';
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
  const hasDecision = ctx.repo.loadDecisions(id).length > 0;
  const allEvents = ctx.repo.readEvents(id);
  const authorizedAt = allEvents.find((e) => e.type === 'BUYER_APPROVED')?.ts;
  const authWindow = authorizedAt && !tx.captured && tx.paypalAuthId && !['VOIDED', 'CANCELLED', 'REFUNDED', 'COMPLETED'].includes(tx.status)
    ? authorizationWindow(authorizedAt, now) : null;
  const disputeType = allEvents.find((e) => e.type === 'OPEN_DISPUTE')?.payload.disputeType;
  const lastEvent = allEvents.at(-1);
  const captureFailed = lastEvent?.type === 'PAYPAL_ERROR' && lastEvent.payload.effect === 'PAYPAL_CAPTURE' && !tx.captured;
  const events = tx.captured && tx.trackingNumber ? ctx.repo.readEvents(id) : [];
  const trackingOnPayPal = !tx.captured || !tx.trackingNumber ? null
    : events.some((e) => e.type === 'PAYPAL_TRACKING_ADDED') ? (simulated ? 'Sent (simulated)' : 'Sent')
    : events.some((e) => e.type === 'PAYPAL_TRACKING_FAILED') ? 'Failed, retried automatically'
    : 'Not sent yet';
  const terms = JSON.parse(tx.termsJson) as Record<string, unknown>;
  const criteria = Array.isArray(terms.criteria) ? terms.criteria as string[] : [];
  const accepted = tx.status === 'DRAFT' ? ctx.repo.listAcceptances(id) : [];
  const action = nextAction(tx.status, role) === 'accept-terms' && accepted.includes(role as 'buyer' | 'seller') ? 'none' : nextAction(tx.status, role);
  const deadline = tx.status === 'AUTHORIZED' ? timeLeft(tx.shipBy, now)
    : tx.status === 'IN_INSPECTION' ? timeLeft(tx.inspectionUntil, now)
    : tx.status === 'DISPUTED' ? timeLeft(tx.evidenceUntil, now)
    : tx.status === 'RETURN_REQUESTED' ? timeLeft(tx.returnBy, now) : null;

  return (
    <AppShell active="Deals">
      {(() => { const label = recentSuccess(tx.status, allEvents.at(-1)?.ts, ctx.now()); return label ? <SuccessBurst storageKey={`${id}:${tx.status}`} label={label}/> : null; })()}
      <PageHeader title={`Deal #${id.slice(0, 8).toUpperCase()}`} back="/deals"/>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-4 text-center lg:text-left">
            <p className="text-sm text-muted">{tx.item}</p>
            <p className="mt-1 text-[32px] font-extrabold tracking-tight text-heading tabular-nums">{money(tx.amount, tx.currency)}</p>
            <StatusPill status={tx.status} suffix={deadline ?? undefined}/>
          </div>
          {created && role === 'seller' && (
            <div className="mb-4 space-y-2"><Notice>Deal created and your terms are accepted. Share the link with the buyer; they accept and pay on the checkout screen.</Notice><CopyLinkButton path={`/deals/${id}/checkout`}/></div>
          )}
          {simulated && <div className="mb-4"><Notice tone="warning">Simulated payment. The PayPal steps of this deal were simulated: nothing was sent to PayPal and no money moved.</Notice></div>}
          {captureFailed && <div className="mb-4"><Notice tone="warning">PayPal refused to capture this payment ({String(lastEvent!.payload.code ?? 'error')}{lastEvent!.payload.issue ? `: ${String(lastEvent!.payload.issue)}` : ''}). The authorization may be past PayPal's 3-day honor period. Nothing was charged and the deal has not moved; the seller is not paid until this is resolved. This prototype does not reauthorize automatically.</Notice></div>}
          <PartialRefundNotice tx={tx} events={allEvents}/>
          {(() => {
            // The main action first; the timeline below is supporting context (owner request).
            const next: Partial<Record<typeof action, { label: string; href: string; cta: string }>> = {
              'accept-terms': role === 'buyer' ? { label: 'review and accept the terms', href: `/deals/${id}/checkout`, cta: 'Review terms & pay' } : { label: 'accept the terms', href: '#next-step', cta: 'Go to accept' },
              pay: { label: 'review and pay', href: `/deals/${id}/checkout`, cta: 'Review & pay' },
              'wait-approval': { label: 'approve the payment on PayPal', href: `/deals/${id}/checkout`, cta: 'Open checkout' },
              ship: { label: 'add the tracking number', href: '#next-step', cta: 'Add tracking' },
              'confirm-or-dispute': { label: 'confirm receipt or open a dispute', href: '#next-step', cta: 'Choose' },
              'add-evidence': { label: 'submit your evidence', href: `/deals/${id}/evidence`, cta: 'Add evidence' },
              review: { label: 'review the dispute', href: `/deals/${id}/review`, cta: 'Review dispute' },
              'ship-return': { label: 'ship the item back', href: '#next-step', cta: 'Add return tracking' },
            };
            const step = next[action];
            return step ? <section aria-label="Next step summary" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border-2 border-accent bg-surface p-4">
              <div className="min-w-0"><p className="text-sm font-bold text-heading">Next: {step.label}</p>{deadline && <p className="mt-0.5 text-xs text-muted">Time left: {deadline}</p>}</div>
              <ButtonLink href={step.href} className="shrink-0">{step.cta}</ButtonLink>
            </section> : null;
          })()}
          <Card><h2 className="mb-4 text-sm font-bold text-heading">Progress</h2><Timeline steps={timelineFor(tx.status, tx.frozenFrom)}/></Card>
          <div className="mt-4"><ActivityFeed txId={id} items={activityFeed(allEvents)} now={now}/></div>
          <SectionTitle>Locked terms</SectionTitle>
          <KeyValue items={[
            ...(typeof terms.category === 'string' && TERMS_TEMPLATES.some((t) => t.id === terms.category) ? [{ label: 'Item type', value: TERMS_TEMPLATES.find((t) => t.id === terms.category)!.label }] : []),
            { label: 'Condition', value: String(terms.condition ?? '—') },
            ...(Array.isArray(terms.includedItems) ? [{ label: 'Included items', value: terms.includedItems.filter((item): item is string => typeof item === 'string').join(', ') }] : []),
            ...(terms.description ? [{ label: 'Description', value: String(terms.description) }] : []),
            ...criteria.map((c, i) => ({ label: `Check ${i + 1}`, value: c })),
            { label: 'Terms hash', value: <span className="font-mono text-xs">{shortHash(tx.termsHash, 6)}</span> },
            ...(tx.trackingNumber ? [{ label: 'Tracking (simulated)', value: tx.trackingNumber }] : []),
          ]}/>
        </div>

        <aside className="space-y-3">
          <PayPalDisputePanel tx={tx} cases={ctx.repo.listPayPalDisputes(id)} role={role} simulatedMode={simulatedPayPal()} reviewerAllowed={role !== 'reviewer' || await reviewerUnlocked()}/>
          {role === 'seller' && disputeType === 'damaged' && <><SectionTitle>Courier claim</SectionTitle><Card><CourierClaimPack txId={id}/></Card></>}
          <div id="next-step" className="scroll-mt-6"><SectionTitle>Next step</SectionTitle></div>
          {action === 'accept-terms' && (role === 'buyer'
            ? <ButtonLink href={`/deals/${id}/checkout`} fullWidth>Review terms & pay</ButtonLink>
            : <ActionButton path={`/api/transactions/${id}/accept`} role={role} label="Accept terms" fullWidth/>)}
          {action === 'pay' && <ButtonLink href={`/deals/${id}/checkout`} fullWidth>Review & pay</ButtonLink>}
          {action === 'wait-approval' && <Notice>Waiting for your approval on PayPal (Sandbox). If you closed the PayPal window, start again from the checkout screen after it expires.</Notice>}
          {action === 'ship' && <Card><ShipForm txId={id}/></Card>}
          {action === 'confirm-or-dispute' && (
            <div className="space-y-3">
              <ActionButton path={`/api/transactions/${id}/confirm`} role="buyer" label="Confirm receipt" fullWidth confirm={{
                title: 'Confirm you received the item', amount: money(tx.amount, tx.currency), amountCaption: tx.item,
                rows: [{ label: 'Payment', value: 'Captured via PayPal' }, { label: 'Disputes', value: 'No longer possible here' }],
                note: 'Only confirm after you checked the item against the locked terms.', confirmLabel: 'Confirm receipt',
              }}/>
              <Card><DisputeSteps txId={id} evidenceWindow={`${ctx.time.evidenceDays} day${ctx.time.evidenceDays === 1 ? '' : 's'}`}/></Card>
            </div>
          )}
          {action === 'add-evidence' && <ButtonLink href={`/deals/${id}/evidence`} fullWidth>Add evidence</ButtonLink>}
          {action === 'ship-return' && <Card><ReturnForm txId={id}/></Card>}
          {tx.status === 'RETURN_REQUESTED' && <Notice>A reviewer decided to refund the buyer once the item is back with the seller. The buyer has until the deadline to ship it back; if no delivered return is recorded by then, the payment goes to the seller.</Notice>}
          {action === 'review' && <ButtonLink href={`/deals/${id}/review`} fullWidth>Review dispute</ButtonLink>}
          {tx.status === 'DRAFT' && <Notice>Accepted so far: {accepted.length ? accepted.join(' and ') : 'nobody'}. Terms lock when both buyer and seller accept.</Notice>}
          {action === 'none' && <Notice>{tx.status === 'FROZEN_EXTERNAL' ? 'A PayPal dispute or reversal is open. Nothing moves until PayPal resolves it.' : 'Nothing to do for your role right now. Switch role in Menu to act as another party.'}</Notice>}

          <KeyValue items={[
            { label: 'PayPal fee', value: simulated ? 'None (simulated)' : tx.captured ? 'See PayPal capture' : 'Shown after capture' },
            ...(authWindow ? [{ label: 'PayPal authorization', value: authWindow.phase === 'honor' ? `Honored until ${shortDate(authWindow.honorEndsAt)}` : authWindow.phase === 'after-honor' ? `Past the 3-day honor period; capture not guaranteed (expires ${shortDate(authWindow.expiresAt)})` : 'Expired: can no longer be captured' }] : []),
            { label: 'Fee on refund borne by', value: 'Platform (buyer receives the decided refund amount)' },
            ...(trackingOnPayPal ? [{ label: 'Tracking on PayPal', value: trackingOnPayPal }] : []),
          ]}/>
          {hasDecision && <ButtonLink href={`/deals/${id}/decision`} fullWidth>Decision receipt</ButtonLink>}
          <ButtonLink href={`/audit/${id}`} variant="ghost" fullWidth>Audit log</ButtonLink>
          <p className="text-center text-xs text-muted">Every action is recorded in the audit log.</p>
        </aside>
      </div>
    </AppShell>
  );
}
