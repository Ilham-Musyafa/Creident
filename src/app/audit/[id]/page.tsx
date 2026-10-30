import { displayItemName } from '../../../components/displayItemName';
import { RecordMenu } from '../../../components/client';
import { notFound } from 'next/navigation';
import { verifyChain } from '../../../lib/audit/chain';
import { latestCheckpoint } from '../../../lib/audit/checkpointFiles';
import { AuditEvent, ChainStatus } from '../../../components/ui';
import { Card } from '../../../components/layout';
import { RecordsShell } from '../../../components/RecordsShell';
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
    ? `Verified on this server and against the saved copy from ${shortDate(sealed.createdAt)}`
    : 'Verified on this server';

  return (
    <RecordsShell role={role} title="Deal record" back="/audit" desktopBack={`/deals/${id}`} subtitle={displayItemName(tx.item)} right={<RecordMenu txId={id} role={role}/>}>
      <div className="mx-auto max-w-2xl space-y-4">
        <ChainStatus revealAfterMs={Math.min(events.length, 24) * 70 + 300} verifiedSteps={verifiedSteps} count={events.length} where={where}/>
        {sealedState === 'rewritten' && <p className="text-sm font-semibold" style={{ color: 'var(--warning-text)' }}>⚠ This record differs from the saved copy.</p>}
        <Card className="records-timeline px-4 py-1">
          <ol aria-label="Record steps">
            {[...events].reverse().map((e, index) => (
              <AuditEvent index={index} key={e.seq} seq={e.seq} title={eventTitle(e.type)} rawType={e.type} actor={e.actor} time={shortDate(e.ts)} prevHash={shortHash(e.prevHash)} fullPrevHash={e.prevHash} hash={e.hash} check={check.ok || e.seq < check.brokenAtSeq ? 'ok' : e.seq === check.brokenAtSeq ? 'failed' : 'after'} simulated={e.payload.simulated === true}/>
            ))}
          </ol>
        </Card>
        <p className="text-center text-sm text-muted">Tap a step to see who did it. Its check values are in Technical details.</p>
      </div>
    </RecordsShell>
  );
}
