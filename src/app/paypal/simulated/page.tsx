import { notFound } from 'next/navigation';
import { ButtonLink, KeyValue } from '../../../components/ui';
import { AppShell, Card, Notice, PageHeader } from '../../../components/layout';
import { money } from '../../../components/view';
import { payPalMode } from '../../../lib/paypal/simulated';
import { data, isUuid } from '../../_server';

export const dynamic = 'force-dynamic';

// Stand-in for the PayPal approval screen when PAYPAL_MODE=simulated. Labelled on purpose:
// nothing here is PayPal, and no real or Sandbox money moves.
export default async function SimulatedApprovalPage({ searchParams }: { searchParams: Promise<{ txId?: string; token?: string }> }) {
  if (payPalMode() !== 'simulated') notFound();
  const { txId = '', token = '' } = await searchParams;
  if (!isUuid(txId)) notFound();
  const tx = data().repo.loadTransaction(txId);
  if (!tx || tx.status !== 'AWAITING_APPROVAL' || !tx.paypalOrderId || tx.paypalOrderId !== token) notFound();

  const back = (extra: Record<string, string>) => `/paypal/return?${new URLSearchParams({ txId, role: 'buyer', ...extra })}`;
  return (
    <AppShell active="Deals">
      <PageHeader title="Demo PayPal approval" back={`/deals/${txId}/checkout`}/>
      <div className="mx-auto max-w-[520px] space-y-4">
        <Notice tone="warning">Demo only. This is not PayPal and no money moves. It stands in for the PayPal approval step so you can try the whole flow.</Notice>
        <Card>
          <p className="text-sm text-muted">{tx.item}</p>
          <p className="mt-1 text-[32px] font-extrabold tracking-tight text-heading tabular-nums">{money(tx.amount, tx.currency)}</p>
          <p className="mt-1 text-xs text-muted">You approve now; you are charged only after you confirm the item or a problem is decided.</p>
        </Card>
        <KeyValue items={[{ label: 'Demo order', value: <span className="font-mono text-xs">{token}</span> }]}/>
        <div className="grid grid-cols-[1fr_1.3fr] gap-2">
          <ButtonLink href={back({ cancel: '1' })} variant="ghost" fullWidth>Cancel</ButtonLink>
          <ButtonLink href={back({ token })} fullWidth>Approve payment (demo)</ButtonLink>
        </div>
      </div>
    </AppShell>
  );
}
