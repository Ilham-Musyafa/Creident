import { displayItemName } from '../../../../components/displayItemName';
import { TechnicalDetails } from '../../../../components/TechnicalDetails';
import { TermsChecklist } from '../../../../components/TermsChecklist';
import { notFound } from 'next/navigation';
import { StatusPill } from '../../../../components/ui';
import { AppShell, Card, Notice, PageHeader, SectionTitle } from '../../../../components/layout';
import { ActionButton, PayButton } from '../../../../components/client';
import { money } from '../../../../components/view';
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
      {/^\[Demo\]/i.test(tx.item) && <p className="mb-3 text-xs font-semibold text-muted">Demo</p>}
      <div className="mx-auto max-w-xl space-y-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-sm font-bold text-heading">{displayItemName(tx.item)}</p><p className="text-sm text-muted">Condition: {String(terms.condition ?? '—')}</p></div>
            <p className="text-lg font-extrabold tabular-nums text-heading">{money(tx.amount)}</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2"><StatusPill status={tx.status}/></div>
        </Card>

        <TechnicalDetails><p>Deal ID: <span className="break-all font-mono">{id}</span></p>{tx.termsHash && <p>Terms fingerprint: <span className="break-all font-mono">{tx.termsHash}</span></p>}</TechnicalDetails>
        <TermsChecklist terms={terms}/>

        <SectionTitle>How it works</SectionTitle>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-extrabold text-heading">{i + 1}</span><div><p className="text-sm font-semibold text-heading">{s.title}</p><p className="text-sm text-muted">{s.detail}</p></div></li>
          ))}
        </ol>

        <Notice tone={simulated ? 'warning' : 'info'}>{simulated ? 'Demo payment: no real money moves.' : 'PayPal Sandbox test: no real money moves.'}</Notice>

        {role !== 'buyer' ? <Notice>Only the buyer pays. Switch to Buyer in Settings.</Notice>
          : tx.status === 'DRAFT' && accepted.includes('buyer') ? <Notice>You accepted the terms. Waiting for the seller to accept.</Notice>
          : tx.status === 'DRAFT' ? <ActionButton path={`/api/transactions/${id}/accept`} role="buyer" label="Accept terms & continue" fullWidth/>
          : tx.status === 'TERMS_LOCKED' ? <><PayButton txId={id} simulated={simulated} amount={money(tx.amount, tx.currency)} item={displayItemName(tx.item)}/><p className="text-center text-sm text-muted">You will approve the payment on PayPal and come back here.</p></>
          : <Notice>Payment is already past this step. Open the deal to see its status.</Notice>}
      </div>
    </AppShell>
  );
}
