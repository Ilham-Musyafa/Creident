import { AppShell, Notice, PageHeader } from '../../../components/layout';
import { NewDealForm } from '../../../components/NewDealForm';
import { data, getRole, simulatedPayPal } from '../../_server';

export const dynamic = 'force-dynamic';

export default async function NewDealPage() {
  const role = await getRole();
  const time = data().time;
  return (
    <AppShell active="Deals">
      <PageHeader title="New deal" back="/" subtitle="Terms are set before payment and locked when both parties accept."/>
      {role !== 'seller' ? (
        <Notice>Only the seller creates a deal. Switch to Seller in Settings.</Notice>
      ) : (
        <NewDealForm time={time} simulated={simulatedPayPal()}/>
      )}
    </AppShell>
  );
}
