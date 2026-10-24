import Link from 'next/link';
import { TransactionIcon } from './TransactionIcon';
import { StatusPill } from './ui';
import type { TransactionRow } from './transactionsView';

/** Shared mobile row: actual status, amount and next action, without repeated demo prefixes. */
export function MobileTransactionRow({ row }: { row: TransactionRow }) {
  return <Link href={row.href} className="flex min-w-0 items-start gap-3 px-4 py-4 hover:bg-surface-2">
    <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-heading"><TransactionIcon name={row.icon}/></span>
    <span className="min-w-0 flex-1">
      <span className="flex items-start justify-between gap-2"><span className="min-w-0 break-words text-sm font-semibold text-heading">{row.title}</span><strong className="shrink-0 text-sm tabular-nums text-heading">{row.amount}</strong></span>
      <span className="mt-2 flex flex-wrap items-center gap-1.5"><StatusPill status={row.status}/>{row.demo && <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">Demo</span>}</span>
      {(row.needsAction || row.nextStep === 'Refund pending verification') && <span className="mt-2 block text-sm font-medium text-heading">{row.nextStep}</span>}
      {row.deadlineLabel && <span className="mt-1 block text-xs text-muted">{row.deadlineLabel}</span>}
    </span>
  </Link>;
}
