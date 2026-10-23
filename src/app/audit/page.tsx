import { latestCheckpoint } from '../../lib/audit/checkpointFiles';
import Link from 'next/link';
import { verifyChain } from '../../lib/audit/chain';
import { StatusPill } from '../../components/ui';
import { AppShell, EmptyState, PageHeader } from '../../components/layout';
import { shortDate } from '../../components/view';
import { data } from '../_server';

export const dynamic = 'force-dynamic';

export default function AuditIndexPage() {
  const ctx = data();
  // Records that failed verification come first, so the affected deal is the first thing seen.
  const rows = ctx.repo.listTransactions().map((tx) => ({ tx, check: verifyChain(ctx.repo.readEvents(tx.id)) }))
    .sort((a, b) => Number(a.check.ok) - Number(b.check.ok));
  const chains = new Map(ctx.db.prepare('SELECT id FROM transactions ORDER BY id').all()
    .map(row => [String(row.id), ctx.repo.readEvents(String(row.id))] as const));
  const published = latestCheckpoint(chains);
  const checkpoint = published.available && published.result.valid ? published.result : null;
  // Per deal, only problems with the sealed copy are worth a line.
  const sealedProblem = { rewritten: 'Differs from the sealed copy', 'not-checkpointed': 'Not in the sealed copy yet' } as Record<string, string>;
  const missing = checkpoint?.transactions.filter(entry => !chains.has(entry.txId)) ?? [];
  const broken = rows.filter((r) => !r.check.ok).length;
  const firstBroken = rows.find((r) => !r.check.ok);
  const where = checkpoint ? `Verified on this server and against the sealed copy from ${shortDate(checkpoint.createdAt)}`
    : published.available && !published.result.valid ? `Verified on this server. The sealed copy could not be checked: ${published.result.reason}`
    : 'Verified on this server';

  return (
    <AppShell active="Audit">
      <PageHeader title="Deal records" subtitle="Every step of every deal is saved and checked for changes."/>
      {rows.length > 0 && (
        <div role="status" className="mb-4 rounded-[18px] border p-4 text-sm" style={broken
          ? { background: 'var(--warning-bg)', borderColor: 'var(--warning-line)', color: 'var(--warning-text)' }
          : { background: 'var(--success-bg)', borderColor: 'var(--success-line)', color: 'var(--success-text)' }}>
          <strong className="block">{broken ? `⚠ ${broken} of ${rows.length} records failed verification` : `✓ ${rows.length} records verified`}</strong>
          <span className="mt-0.5 block text-sm">{broken ? 'Checked on this server. Open the flagged deal to see which step.' : where}{missing.length > 0 && `. ${missing.length} deal(s) in the sealed copy are missing here.`}</span>
          {firstBroken && <Link href={`/audit/${firstBroken.tx.id}`} className="hv-press mt-3 flex min-h-11 w-full items-center justify-center rounded-full px-4 text-sm font-bold" style={{ background: 'var(--warning-text)', color: 'var(--surface)' }}>{broken > 1 ? `View affected records (${broken})` : 'View affected record'}</Link>}
          <Link href="/audit/how-it-works" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">How verification works</Link>
        </div>
      )}
      {rows.length === 0 ? <EmptyState title="No deals yet"/> : (
        <ul className="space-y-2">
          {rows.map(({ tx, check }) => {
            const problem = checkpoint ? sealedProblem[checkpoint.transactions.find(entry => entry.txId === tx.id)?.state ?? ''] : undefined;
            return (
              <li key={tx.id}>
                <Link href={`/audit/${tx.id}`} className={`flex min-h-[64px] items-center justify-between gap-3 rounded-[18px] border bg-surface p-3 hover:bg-surface-2 ${check.ok ? 'border-line' : 'border-2'}`} style={check.ok ? undefined : { borderColor: 'var(--warning-text)' }}>
                  <span className="min-w-0"><span className="block break-words text-sm font-bold text-heading">{tx.item}</span><StatusPill status={tx.status}/>
                    {problem && <span className="mt-1 block text-sm font-semibold" style={{ color: 'var(--warning-text)' }}>⚠ {problem}</span>}</span>
                  {check.ok
                    ? <span className="shrink-0 text-right text-sm text-muted">{check.length} steps</span>
                    : <span className="shrink-0 text-right text-sm font-semibold" style={{ color: 'var(--warning-text)' }}>⚠ Failed at step #{check.brokenAtSeq}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
