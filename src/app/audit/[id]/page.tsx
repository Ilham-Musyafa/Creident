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
  const demoRecords = events.some(e => e.payload.simulated === true || e.payload.demo === true);
  const roles = new Set(events.filter(e => ['buyer', 'seller', 'reviewer'].includes(e.actor)).map(e => e.actor)).size;
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
    <RecordsShell role={role} title="Deal history" back="/audit" desktopBack={`/deals/${id}`} subtitle={displayItemName(tx.item)} right={<RecordMenu txId={id} role={role}/>}>
      <div className="deal-history-detail space-y-4">
        <ChainStatus verifiedSteps={verifiedSteps} count={events.length} where={where}/>
        <p className="text-sm text-muted">Tap a step to see who did it. Its check values are in Technical details.</p>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted"><span>{events.length} steps · {roles} {roles === 1 ? 'role' : 'roles'}</span><span>Newest first</span></div>
        {demoRecords && <p className="rounded-[12px] bg-surface-2 px-4 py-3 text-sm text-muted">Demo records below are not from PayPal.</p>}
        {sealedState === 'rewritten' && <p className="text-sm font-semibold" style={{ color: 'var(--warning-text)' }}>⚠ This record differs from the saved copy.</p>}
        <Card className="deal-history-timeline">
          <ol aria-label="Record steps">
            {[...events].reverse().map(e => (
              <AuditEvent timeline paypalSource={e.actor === 'paypal' && e.payload.simulated !== true} key={e.seq} seq={e.seq} title={eventTitle(e.type)} rawType={e.type} actor={e.actor} time={shortDate(e.ts)} prevHash={shortHash(e.prevHash)} fullPrevHash={e.prevHash} hash={e.hash} check={check.ok || e.seq < check.brokenAtSeq ? 'ok' : e.seq === check.brokenAtSeq ? 'failed' : 'after'} simulated={e.payload.simulated === true}/>
            ))}
          </ol>
        </Card>
      </div>
    </RecordsShell>
  );
}
