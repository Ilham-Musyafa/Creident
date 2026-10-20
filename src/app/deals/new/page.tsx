import { AppShell, Card, Notice, PageHeader } from '../../../components/layout';
import { NewDealForm } from '../../../components/client';
import { KeyValue } from '../../../components/ui';
import { data, getRole } from '../../_server';

export const dynamic = 'force-dynamic';

export default async function NewDealPage() {
  const role = await getRole();
  const time = data().time;
  return (
    <AppShell active="New">
      <PageHeader title="New deal" back="/" subtitle="Terms are set before payment and locked when both parties accept."/>
      {role !== 'seller' ? (
        <Notice>Only the seller creates a deal. Switch to Seller in Menu.</Notice>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Card><NewDealForm/></Card>
          <div className="space-y-3">
            <KeyValue items={[
              { label: 'Seller ships within', value: `${time.shipByDays} days` },
              { label: 'Buyer inspection', value: `${time.inspectionDays} days` },
              { label: 'Evidence window', value: `${time.evidenceDays} days` },
              { label: 'PayPal fee', value: 'Shown after capture' },
              { label: 'Fee on refund borne by', value: 'TBD' },
            ]}/>
            <Notice>Time windows are placeholders until final values are decided. Currency is USD (PayPal Sandbox).</Notice>
          </div>
        </div>
      )}
    </AppShell>
  );
}
