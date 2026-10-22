import { TermsChecklist } from '../../../../components/TermsChecklist';
import { notFound } from 'next/navigation';
import { StatusPill } from '../../../../components/ui';
import { AppShell, Card, Notice, PageHeader, SectionTitle } from '../../../../components/layout';
import { ActionButton, PayButton } from '../../../../components/client';
import { money, shortHash } from '../../../../components/view';
import { data, getRole, isUuid, simulatedPayPal } from '../../../_server';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const ctx = data();
  const tx = ctx.repo.loadTransaction(id);
  if (!tx) notFound();
  const role = await getRole();
  const simulated = simulatedPayPal();
  const terms = JSON.parse(tx.termsJson) as Record<string, unknown>;
  const { shipByDays, inspectionDays } = ctx.time;
  const accepted = tx.status === 'DRAFT' ? ctx.repo.listAcceptances(id) : [];

  const steps = [
    { title: `You approve ${money(tx.amount)} on PayPal`, detail: 'You are not charged yet.' },
    { title: `Seller ships within ${shipByDays} days`, detail: 'If it is not shipped in time, the payment is cancelled.' },
    { title: `You check the item for ${inspectionDays} days`, detail: 'Confirm it, or report a problem with evidence.' },
  ];

  return (
    <AppShell active="Deals">
      <PageHeader title="Review & pay" back={`/deals/${id}`}/>
      <div className="mx-auto max-w-xl space-y-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-sm font-bold text-heading">{tx.item}</p><p className="text-xs text-muted">Condition: {String(terms.condition ?? '—')}</p></div>
            <p className="text-lg font-extrabold tabular-nums text-heading">{money(tx.amount)}</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2"><StatusPill status={tx.status}/>{tx.termsHash && <span className="font-mono text-xs text-muted">terms {shortHash(tx.termsHash)}</span>}</div>
        </Card>

        <TermsChecklist terms={terms}/>

        <SectionTitle>How it works</SectionTitle>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-extrabold text-heading">{i + 1}</span><div><p className="text-sm font-semibold text-heading">{s.title}</p><p className="text-xs text-muted">{s.detail}</p></div></li>
          ))}
        </ol>

        <Notice tone={simulated ? 'warning' : 'info'}>{simulated ? 'Demo payment: no real money moves. ' : 'PayPal Sandbox test: no real money moves. '}HalcyVault is a dispute-mediation prototype, not an escrow service.</Notice>

        {role !== 'buyer' ? <Notice>Only the buyer pays. Switch to Buyer in Menu.</Notice>
          : tx.status === 'DRAFT' && accepted.includes('buyer') ? <Notice>You accepted the terms. Waiting for the seller to accept.</Notice>
          : tx.status === 'DRAFT' ? <ActionButton path={`/api/transactions/${id}/accept`} role="buyer" label="Accept terms" fullWidth/>
          : tx.status === 'TERMS_LOCKED' ? <><PayButton txId={id} simulated={simulated} amount={money(tx.amount, tx.currency)} item={tx.item}/><p className="text-center text-xs text-muted">You will approve the payment on PayPal and come back here.</p></>
          : <Notice>Payment is already past this step. Open the deal to see its status.</Notice>}
      </div>
    </AppShell>
  );
}
