import { latestCheckpoint } from '../../lib/audit/checkpointFiles';
import Link from 'next/link';
import { verifyChain } from '../../lib/audit/chain';
import { StatusPill } from '../../components/ui';
import { AppShell, EmptyState, Notice, PageHeader } from '../../components/layout';
import { data } from '../_server';

export const dynamic = 'force-dynamic';

export default function AuditIndexPage() {
  const ctx = data();
  const rows = ctx.repo.listTransactions().map((tx) => ({ tx, check: verifyChain(ctx.repo.readEvents(tx.id)) }));
  const chains = new Map(ctx.db.prepare('SELECT id FROM transactions ORDER BY id').all()
    .map(row => [String(row.id), ctx.repo.readEvents(String(row.id))] as const));
  const published = latestCheckpoint(chains);
  const checkpoint = published.available && published.result.valid ? published.result : null;
  const checkpointLabels = { unchanged: 'matches the sealed copy', extended: 'new steps since the sealed copy', rewritten: 'differs from the sealed copy', 'not-checkpointed': 'not in the sealed copy yet' };
  const missing = checkpoint?.transactions.filter(entry => !chains.has(entry.txId)) ?? [];
  const broken = rows.filter((r) => !r.check.ok).length;

  return (
    <AppShell active="Audit">
      <PageHeader title="Deal records" subtitle="Every step of every deal is saved and checked for changes. Open a deal to see its steps."/>
      <div className="mb-4"><Notice tone={published.available && !published.result.valid ? 'warning' : 'info'}>
        {checkpoint ? `Latest sealed copy: ${checkpoint.createdAt}`
          : published.available ? `Sealed copy could not be checked: ${published.result.valid ? '' : published.result.reason}` : published.message}
        {missing.length > 0 && ` · ${missing.length} deal(s) in the sealed copy are missing from the current records.`}
      </Notice></div>
      {rows.length > 0 && (
        <div role="status" className="mb-4 rounded-[18px] border p-4 text-sm font-semibold" style={broken
          ? { background: 'var(--warning-bg)', borderColor: 'var(--warning-line)', color: 'var(--warning-text)' }
          : { background: 'var(--success-bg)', borderColor: 'var(--success-line)', color: 'var(--success-text)' }}>
          {broken ? `${broken} of ${rows.length} records were changed` : `All ${rows.length} records intact`}
        </div>
      )}
      {rows.length === 0 ? <EmptyState title="No deals yet"/> : (
        <ul className="space-y-2">
          {rows.map(({ tx, check }) => (
            <li key={tx.id}>
              <Link href={`/audit/${tx.id}`} className="flex min-h-[64px] items-center justify-between gap-3 rounded-[18px] border border-line bg-surface p-3 hover:bg-surface-2">
                <span className="min-w-0"><span className="block break-words text-sm font-bold text-heading">{tx.item}</span><StatusPill status={tx.status}/>{checkpoint && <span className="mt-1 block text-xs text-muted">{checkpointLabels[checkpoint.transactions.find(entry => entry.txId === tx.id)!.state]}</span>}</span>
                <span className="shrink-0 text-right text-xs font-semibold" style={{ color: check.ok ? 'var(--success-text)' : 'var(--warning-text)' }}>
                  {check.ok ? `Intact · ${check.length} steps` : `Changed at step #${check.brokenAtSeq}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6"><Notice>The platform still runs this database, so a signed sealed copy of each record's fingerprint can be published elsewhere. Anyone holding that copy can spot later rewriting; it does not make rewriting impossible.</Notice></div>
    </AppShell>
  );
}
