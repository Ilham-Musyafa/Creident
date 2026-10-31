import Link from 'next/link';
import { resolveDealCategory } from '../lib/dealCategories';
import { TransactionIcon } from './TransactionIcon';
import { StatusPill } from './ui';
import { DueSoon } from './DueSoon';
import { shortDate, type TransactionRow } from './transactionsView';

export function shortDeadline(label: string): string {
  return label.replace(/^(\d+ (?:days?|hours?|minutes?)).* left$/, '$1 left');
}

/** Scan the item, category/date and status; the deal page holds the next action. */
export function MobileTransactionRow({ row, compact = false }: { row: TransactionRow; compact?: boolean }) {
  const date = shortDate(row.createdAt)?.replace(/ \d{4}$/, '');
  const category = resolveDealCategory(row.category, row.subcategory).category.label;
  return <Link href={`/deals/${row.id}`} className={`mobile-deal-row flex min-h-[88px] min-w-0 items-center gap-3 hover:bg-surface-2 ${compact ? 'px-3 py-3' : 'px-4 py-4'}`}>
    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-2 text-heading"><TransactionIcon name={row.icon}/></span>
    <span className="min-w-0 flex-1">
      <span className="line-clamp-2 break-words text-sm font-semibold text-heading" title={row.title}>{row.title}</span>
      <span className="mobile-deal-subtitle mt-1 flex min-w-0 items-baseline gap-1 whitespace-nowrap text-xs text-muted"><span className="truncate" title={category}>{category}</span>{date && <span className="shrink-0">- {date}</span>}</span>
      <span className="mt-2 flex flex-wrap items-center gap-1.5"><StatusPill status={row.status} short/><DueSoon urgency={row.urgency} label={row.deadlineLabel}/></span>
    </span>
    <strong className="shrink-0 text-right font-display text-sm tabular-nums text-heading">{row.amount}</strong>
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 shrink-0 text-muted"><path d="m9 6 6 6-6 6"/></svg>
  </Link>;
}
