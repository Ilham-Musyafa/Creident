import { CategoryChip } from './CategoryChip';
import Link from 'next/link';
import { TransactionIcon } from './TransactionIcon';
import { StatusPill } from './ui';
import { DueSoon } from './DueSoon';
import { shortDate, type TransactionRow } from './transactionsView';

/** Keep the full deadline available while the compact surface shows its largest time unit. */
export function shortDeadline(label: string): string {
  return label.replace(/^(\d+ (?:days?|hours?|minutes?)).* left$/, '$1 left');
}

/** Shared mobile row: actual status, amount and next action, without repeated demo prefixes. */
export function MobileTransactionRow({ row, compact = false }: { row: TransactionRow; compact?: boolean }) {
  if (compact) return <Link href={row.href} className="flex min-h-[72px] min-w-0 items-center gap-2.5 px-3 py-2.5 hover:bg-surface-2">
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-heading"><TransactionIcon name={row.icon}/></span>
    <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="min-w-0 break-words text-sm font-semibold text-heading">{row.title}</span><strong className="shrink-0 font-display text-sm tabular-nums text-heading">{row.amount}</strong></span>
      <span className="mt-1 flex flex-wrap items-center gap-1.5"><CategoryChip category={row.category} subcategory={row.subcategory}/><StatusPill status={row.status} compact/>{row.deadlineLabel && <span title={row.deadlineLabel} className="ml-auto flex items-center gap-1.5 text-xs text-muted"><DueSoon urgency={row.urgency}/>{shortDeadline(row.deadlineLabel)}</span>}</span>
      {row.nextStep === 'Refund pending verification' && <span className="mt-1 block text-sm text-heading">{row.nextStep}</span>}
    </span>
  </Link>;
  return <Link href={row.href} className="flex min-w-0 items-start gap-3 px-4 py-4 hover:bg-surface-2">
    <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-[14px] bg-surface-2 text-heading"><TransactionIcon name={row.icon}/></span>
    <span className="min-w-0 flex-1">
      <span className="flex items-start justify-between gap-2"><span className="min-w-0 break-words text-sm font-semibold text-heading">{row.title}</span><strong className="shrink-0 font-display text-sm tabular-nums text-heading">{row.amount}</strong></span>
      <span className="mt-2 flex flex-wrap items-center gap-1.5"><CategoryChip category={row.category} subcategory={row.subcategory}/><StatusPill status={row.status} short/></span>
      {shortDate(row.createdAt) && <span className="mt-1 block text-xs text-muted">{shortDate(row.createdAt)}</span>}
      {((!compact && row.needsAction) || row.nextStep === 'Refund pending verification') && <span className="mt-2 block text-sm font-medium text-heading">{row.nextStep}</span>}
      {row.deadlineLabel && <span title={row.deadlineLabel} className="mt-1 flex items-center gap-1.5 text-xs text-muted"><DueSoon urgency={row.urgency}/>{compact ? shortDeadline(row.deadlineLabel) : row.deadlineLabel}</span>}
    </span>
  </Link>;
}
