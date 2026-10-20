import Link from 'next/link';
import { verifyChain } from '../../lib/audit/chain';
import { StatusPill } from '../../components/ui';
import { AppShell, EmptyState, Notice, PageHeader } from '../../components/layout';
import { data } from '../_server';

export const dynamic = 'force-dynamic';

export default function AuditIndexPage() {
  const ctx = data();
  const rows = ctx.repo.listTransactions().map((tx) => ({ tx, check: verifyChain(ctx.repo.readEvents(tx.id)) }));
  const broken = rows.filter((r) => !r.check.ok).length;

  return (
    <AppShell active="Audit">
      <PageHeader title="Audit & verification" subtitle="Every deal has its own hash-chained log. Open one to see each event."/>
      {rows.length > 0 && (
        <div role="status" className="mb-4 rounded-[18px] border p-4 text-sm font-semibold" style={broken
          ? { background: 'var(--warning-bg)', borderColor: 'var(--warning-line)', color: 'var(--warning-text)' }
          : { background: 'var(--success-bg)', borderColor: 'var(--success-line)', color: 'var(--success-text)' }}>
          {broken ? `${broken} of ${rows.length} chains failed verification` : `All ${rows.length} chains verified`}
        </div>
      )}
      {rows.length === 0 ? <EmptyState title="No deals yet"/> : (
        <ul className="space-y-2">
          {rows.map(({ tx, check }) => (
            <li key={tx.id}>
              <Link href={`/audit/${tx.id}`} className="flex min-h-[64px] items-center justify-between gap-3 rounded-[18px] border border-line bg-surface p-3 hover:bg-surface-2">
                <span className="min-w-0"><span className="block break-words text-sm font-bold text-heading">{tx.item}</span><StatusPill status={tx.status}/></span>
                <span className="shrink-0 text-right text-xs font-semibold" style={{ color: check.ok ? 'var(--success-text)' : 'var(--warning-text)' }}>
                  {check.ok ? `Verified · ${check.length} events` : `Broken at #${check.brokenAtSeq}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6"><Notice>The operator still runs the database, so the head hash should also be published outside it. A verified chain shows nothing was edited, deleted or reordered after it was written.</Notice></div>
    </AppShell>
  );
}
