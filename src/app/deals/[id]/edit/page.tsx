import { notFound } from 'next/navigation';
import { AppShell, Notice, PageHeader } from '../../../../components/layout';
import { NewDealForm } from '../../../../components/NewDealForm';
import { draftFormValues } from '../../../../components/draftForm';
import { canEditDraft, draftRevision } from '../../../../lib/draftTerms';
import { data, getRole, isUuid, simulatedPayPal } from '../../../_server';

export const dynamic = 'force-dynamic';

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const ctx = data(), tx = ctx.repo.loadTransaction(id);
  if (!tx) notFound();
  const role = await getRole();
  const editable = canEditDraft(tx.status, ctx.repo.listAcceptances(id));
  return <AppShell active="Deals">
    <PageHeader title="Edit deal" back={`/deals/${id}`} subtitle="Terms are locked once the buyer accepts"/>
    {role !== 'seller' ? <Notice>Only the seller can edit this deal. Switch to Seller in Settings.</Notice>
      : !editable ? <Notice>Terms are locked once the buyer accepts</Notice>
      : <NewDealForm key={draftRevision(tx)} time={ctx.time} simulated={simulatedPayPal()} draft={{ id, revision: draftRevision(tx), values: draftFormValues(tx), terms: JSON.parse(tx.termsJson) }}/>
    }
  </AppShell>;
}
