import Link from 'next/link';
import type { OversightSnapshot } from '../../lib/oversight';
import { shortDate } from '../view';

/** Read-only saved data remains visible when the optional chart UI cannot run. */
export function SnapshotFallback({ snapshot }: { snapshot: OversightSnapshot }) {
  return <section aria-label="Review desk snapshot" className="min-w-0 space-y-4">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ['Deals', snapshot.totalDeals], ['History verified', snapshot.audit.verified],
      ['History checks failed', snapshot.audit.failed], ['Stored recommendations', snapshot.escalation.recommendations],
    ].map(([label, value]) => <div key={label} className="rounded-[24px] border border-line bg-surface p-5"><h2 className="text-sm font-semibold text-muted">{label}</h2><p className="mt-2 text-3xl font-bold tabular-nums text-heading">{value}</p></div>)}</div>
    <section className="rounded-[24px] border border-line bg-surface p-5">
      <h2 className="mb-3 text-base font-bold text-heading">Disputes</h2>
      {snapshot.disputes.length ? <ul className="space-y-2 text-sm">{snapshot.disputes.map(row => <li key={`${row.status}:${row.type}`} className="flex flex-wrap justify-between gap-2"><span>{row.type} · {row.status.toLowerCase().replaceAll('_', ' ')}</span><strong>{row.count} deals</strong></li>)}</ul> : <p className="text-sm text-muted">No recorded disputes.</p>}
      <p className="mt-3 text-sm text-muted">{snapshot.escalation.escalated} of {snapshot.escalation.recommendations} stored recommendations passed to a person.</p>
    </section>
    <section className="rounded-[24px] border border-line bg-surface p-5">
      <h2 className="mb-3 text-base font-bold text-heading">Deadline queue</h2>
      {snapshot.deadlines.length ? <ul className="divide-y divide-line text-sm">{snapshot.deadlines.map(row => <li key={`${row.txId}:${row.kind}`} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="min-w-0 break-words">{row.item}</span><span className="text-muted">{row.kind} · {shortDate(row.dueAt)}{row.frozen ? ' · on hold' : ''}</span></li>)}</ul> : <p className="text-sm text-muted">No deadlines waiting.</p>}
    </section>
    <Link href="/audit" className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-heading hover:bg-surface-2">Open deal history</Link>
  </section>;
}
