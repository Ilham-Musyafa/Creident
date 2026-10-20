import { notFound } from 'next/navigation';
import { ButtonLink, KeyValue, StatusPill, Timeline } from '../../../components/ui';
import { AppShell, Card, Notice, PageHeader, SectionTitle } from '../../../components/layout';
import { ActionButton, CopyLinkButton, ShipForm } from '../../../components/client';
import { money, nextAction, shortHash, timeLeft, timelineFor } from '../../../components/view';
import { data, getRole, isUuid } from '../../_server';

export const dynamic = 'force-dynamic';

export default async function DealPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const ctx = data();
  const tx = ctx.repo.loadTransaction(id);
  if (!tx) notFound();
  const role = await getRole();
  const created = (await searchParams).created === '1';
  const now = ctx.now();
  const terms = JSON.parse(tx.termsJson) as Record<string, unknown>;
  const criteria = Array.isArray(terms.criteria) ? terms.criteria as string[] : [];
  const accepted = tx.status === 'DRAFT' ? ctx.repo.listAcceptances(id) : [];
  const action = nextAction(tx.status, role) === 'accept-terms' && accepted.includes(role as 'buyer' | 'seller') ? 'none' : nextAction(tx.status, role);
  const deadline = tx.status === 'AUTHORIZED' ? timeLeft(tx.shipBy, now)
    : tx.status === 'IN_INSPECTION' ? timeLeft(tx.inspectionUntil, now)
    : tx.status === 'DISPUTED' ? timeLeft(tx.evidenceUntil, now) : null;

  return (
    <AppShell active="Deals">
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
          <Card><h2 className="mb-4 text-sm font-bold text-heading">Progress</h2><Timeline steps={timelineFor(tx.status, tx.frozenFrom)}/></Card>
          <SectionTitle>Locked terms</SectionTitle>
          <KeyValue items={[
            { label: 'Condition', value: String(terms.condition ?? '—') },
            ...(terms.description ? [{ label: 'Description', value: String(terms.description) }] : []),
            ...criteria.map((c, i) => ({ label: `Check ${i + 1}`, value: c })),
            { label: 'Terms hash', value: <span className="font-mono text-xs">{shortHash(tx.termsHash, 6)}</span> },
            ...(tx.trackingNumber ? [{ label: 'Tracking (simulated)', value: tx.trackingNumber }] : []),
          ]}/>
        </div>

        <aside className="space-y-3">
          <SectionTitle>Next step</SectionTitle>
          {action === 'accept-terms' && (role === 'buyer'
            ? <ButtonLink href={`/deals/${id}/checkout`} fullWidth>Review terms & pay</ButtonLink>
            : <ActionButton path={`/api/transactions/${id}/accept`} role={role} label="Accept terms" fullWidth/>)}
          {action === 'pay' && <ButtonLink href={`/deals/${id}/checkout`} fullWidth>Review & pay</ButtonLink>}
          {action === 'wait-approval' && <Notice>Waiting for your approval on PayPal (Sandbox). If you closed the PayPal window, start again from the checkout screen after it expires.</Notice>}
          {action === 'ship' && <Card><ShipForm txId={id}/></Card>}
          {action === 'confirm-or-dispute' && (
            <div className="grid grid-cols-[1fr_1.3fr] gap-2">
              <ActionButton path={`/api/transactions/${id}/dispute`} role="buyer" label="Open dispute" variant="ghost" fullWidth/>
              <ActionButton path={`/api/transactions/${id}/confirm`} role="buyer" label="Confirm receipt" fullWidth/>
            </div>
          )}
          {action === 'add-evidence' && <ButtonLink href={`/deals/${id}/evidence`} fullWidth>Add evidence</ButtonLink>}
          {action === 'review' && <ButtonLink href={`/deals/${id}/review`} fullWidth>Review dispute</ButtonLink>}
          {tx.status === 'DRAFT' && <Notice>Accepted so far: {accepted.length ? accepted.join(' and ') : 'nobody'}. Terms lock when both buyer and seller accept.</Notice>}
          {action === 'none' && <Notice>{tx.status === 'FROZEN_EXTERNAL' ? 'A PayPal dispute or reversal is open. Nothing moves until PayPal resolves it.' : 'Nothing to do for your role right now. Switch role in Menu to act as another party.'}</Notice>}

          <KeyValue items={[
            { label: 'PayPal fee', value: tx.captured ? 'See PayPal capture' : 'Shown after capture' },
            { label: 'Fee on refund borne by', value: 'TBD' },
          ]}/>
          <ButtonLink href={`/audit/${id}`} variant="ghost" fullWidth>Audit log</ButtonLink>
          <p className="text-center text-xs text-muted">Every action is recorded in the audit log.</p>
        </aside>
      </div>
    </AppShell>
  );
}
