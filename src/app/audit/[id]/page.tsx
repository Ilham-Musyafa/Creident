import { AuditExportButton } from '../../../components/client';
import { notFound } from 'next/navigation';
import { verifyChain } from '../../../lib/audit/chain';
import { AuditEvent, ChainStatus } from '../../../components/ui';
import { AppShell, Card, Notice, PageHeader } from '../../../components/layout';
import { eventTitle, shortDate, shortHash } from '../../../components/view';
import { data, getRole, isUuid } from '../../_server';

export const dynamic = 'force-dynamic';

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const ctx = data();
  const tx = ctx.repo.loadTransaction(id);
  if (!tx) notFound();
  const role = await getRole();
  const events = ctx.repo.readEvents(id);
  const check = verifyChain(events);

  return (
    <AppShell active="Audit">
      <PageHeader title="Audit log" back={`/deals/${id}`} subtitle={tx.item}/>
      <div className="mx-auto max-w-2xl space-y-4">
        <AuditExportButton txId={id} role={role}/>
        <ChainStatus revealAfterMs={Math.min(events.length, 24) * 70 + 300} verified={check.ok} count={events.length} headHash={check.ok ? shortHash(check.head, 6) : `Mismatch at event #${check.brokenAtSeq}: ${check.reason}`}/>
        <Card className="px-4 py-1">
          <ol>
            {[...events].reverse().map((e, index) => (
              <AuditEvent index={index} key={e.seq} seq={e.seq} title={eventTitle(e.type)} rawType={e.type} actor={e.actor} time={shortDate(e.ts)} prevHash={shortHash(e.prevHash)} fullPrevHash={e.prevHash} hash={e.hash} simulated={e.payload.simulated === true}/>
            ))}
          </ol>
        </Card>
        <Notice>Each event stores the hash of the previous one. Editing, deleting or reordering an event breaks the chain and shows here. Events marked Simulated come from the simulated PayPal, demo data or the simulated courier, not from PayPal.</Notice>
      </div>
    </AppShell>
  );
}
