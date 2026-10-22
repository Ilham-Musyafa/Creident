import { RecordMenu } from '../../../components/client';
import { notFound } from 'next/navigation';
import { verifyChain } from '../../../lib/audit/chain';
import { latestCheckpoint } from '../../../lib/audit/checkpointFiles';
import { AuditEvent, ChainStatus } from '../../../components/ui';
import { AppShell, Card, PageHeader } from '../../../components/layout';
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
  const verifiedSteps = check.ok ? events.length : check.brokenAtSeq - 1;

  // Say "on this server" unless a valid sealed copy also matches this deal.
  const chains = new Map(ctx.db.prepare('SELECT id FROM transactions ORDER BY id').all()
    .map(row => [String(row.id), ctx.repo.readEvents(String(row.id))] as const));
  const published = latestCheckpoint(chains);
  const sealed = published.available && published.result.valid ? published.result : null;
  const sealedState = sealed?.transactions.find(t => t.txId === id)?.state;
  const where = sealed && (sealedState === 'unchanged' || sealedState === 'extended')
    ? `Verified on this server and against the sealed copy from ${shortDate(sealed.createdAt)}`
    : 'Verified on this server';

  return (
    <AppShell active="Audit">
      <PageHeader title="Deal record" back={`/deals/${id}`} subtitle={tx.item} right={<RecordMenu txId={id} role={role}/>}/>
      <div className="mx-auto max-w-2xl space-y-4">
        <ChainStatus revealAfterMs={Math.min(events.length, 24) * 70 + 300} verifiedSteps={verifiedSteps} count={events.length} where={where}/>
        {sealedState === 'rewritten' && <p className="text-sm font-semibold" style={{ color: 'var(--warning-text)' }}>⚠ This record differs from the sealed copy.</p>}
        <Card className="px-4 py-1">
          <ol>
            {[...events].reverse().map((e, index) => (
              <AuditEvent index={index} key={e.seq} seq={e.seq} title={eventTitle(e.type)} rawType={e.type} actor={e.actor} time={shortDate(e.ts)} prevHash={shortHash(e.prevHash)} fullPrevHash={e.prevHash} hash={e.hash} intact={check.ok || e.seq < check.brokenAtSeq} simulated={e.payload.simulated === true}/>
            ))}
          </ol>
        </Card>
        <p className="text-center text-xs text-muted">Tap a step to see who did it and its fingerprints.</p>
      </div>
    </AppShell>
  );
}
