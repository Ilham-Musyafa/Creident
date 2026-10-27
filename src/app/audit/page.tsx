import { latestCheckpoint } from '../../lib/audit/checkpointFiles';
import Link from 'next/link';
import { verifyChain } from '../../lib/audit/chain';
import { StatusPill } from '../../components/ui';
import { EmptyState } from '../../components/layout';
import { shortDate } from '../../components/view';
import { data, getRole } from '../_server';
import { RecordsShell, RecordsIcon } from '../../components/RecordsShell';
import { TransactionIcon } from '../../components/TransactionIcon';
import { transactionRow } from '../../components/transactionsView';

export const dynamic = 'force-dynamic';

export default async function AuditIndexPage() {
  const role = await getRole();
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
    <RecordsShell role={role} title="Records" desktopTitle="Records" subtitle="Every step of every deal is saved and checked for changes.">
      {rows.length > 0 && <section aria-label="Record verification" role="status" className="mb-4 rounded-[24px] border bg-bg p-5 lg:hidden" style={{ borderColor: broken ? 'var(--warning-line)' : 'var(--success-line)' }}>
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-full" style={{ background: broken ? 'var(--warning-bg)' : 'var(--success-bg)', color: broken ? 'var(--warning-text)' : 'var(--success-text)' }}><RecordsIcon warning={broken > 0}/></span><div className="min-w-0"><h2 className="text-lg text-heading">{broken ? `${broken} of ${rows.length} records failed verification` : `${rows.length} records verified`}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{broken ? 'Checked on this server. Open the flagged deal to see which step.' : where}{missing.length > 0 && `. ${missing.length} deal(s) in the sealed copy are missing here.`}</p></div></div>
        {firstBroken && <Link href={`/audit/${firstBroken.tx.id}`} className="mt-4 flex min-h-11 items-center justify-center rounded-full bg-strong px-4 text-sm font-semibold text-on-strong">{broken > 1 ? `View affected records (${broken})` : 'View affected record'}</Link>}
      </section>}
      <Link href="/audit/how-it-works" className="mb-5 flex min-h-14 items-center gap-3 rounded-[20px] border border-line bg-bg px-4 py-3 text-sm font-medium text-heading hover:bg-surface-2 lg:hidden"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5 shrink-0 text-[var(--inspection-text)]"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg><span className="flex-1">How verification works</span><span aria-hidden="true">›</span></Link>
      <div className="hidden lg:block">
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
      </div>
      {rows.length === 0 ? <EmptyState title="No deals yet"/> : (
        <ul aria-label="Records" className="space-y-3 lg:space-y-2">
          {rows.map(({ tx, check }) => {
            const problem = checkpoint ? sealedProblem[checkpoint.transactions.find(entry => entry.txId === tx.id)?.state ?? ''] : undefined;
            const view = transactionRow(tx, role, ctx.now());
            return (
              <li key={tx.id}>
                <Link href={`/audit/${tx.id}`} className="flex min-h-[88px] items-start gap-3 rounded-[22px] border bg-bg p-4 hover:bg-surface-2 lg:hidden" style={{ borderColor: check.ok ? 'var(--line)' : 'var(--warning-text)' }}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-heading"><TransactionIcon name={view.icon}/></span>
                  <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold text-heading">{view.title}</span><span className="mt-2 flex flex-wrap items-center gap-1.5"><StatusPill status={tx.status}/>{view.demo && <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">Demo</span>}</span>
                    <span className="mt-2 block text-sm" style={{ color: check.ok ? 'var(--muted)' : 'var(--warning-text)' }}>{check.ok ? `${check.length} steps` : `⚠ Failed at step #${check.brokenAtSeq}`}</span>
                    {problem && <span className="mt-1 block text-sm font-semibold" style={{ color: 'var(--warning-text)' }}>⚠ {problem}</span>}
                  </span><span aria-hidden="true" className="self-center text-heading">›</span>
                </Link>
                <Link href={`/audit/${tx.id}`} className={`hidden min-h-[64px] lg:flex items-center justify-between gap-3 rounded-[18px] border bg-surface p-3 hover:bg-surface-2 ${check.ok ? 'border-line' : 'border-2'}`} style={check.ok ? undefined : { borderColor: 'var(--warning-text)' }}>
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
    </RecordsShell>
  );
}
