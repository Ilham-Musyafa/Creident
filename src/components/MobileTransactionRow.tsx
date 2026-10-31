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
  const category = resolveDealCategory(row.category, row.subcategory).category.label;
  return <Link href={`/deals/${row.id}`} className={`mobile-deal-row flex min-h-[88px] min-w-0 items-center gap-3 hover:bg-surface-2 ${compact ? 'px-3 py-3' : 'px-4 py-4'}`}>
    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-2 text-heading"><TransactionIcon name={row.icon}/></span>
    <span className="min-w-0 flex-1">
      <span className="block break-words text-sm font-semibold text-heading">{row.title}</span>
      <span className="mt-1 block break-words text-xs text-muted">{category}{shortDate(row.createdAt) ? ` - ${shortDate(row.createdAt)}` : ''}{row.demo && <span> · Demo</span>}</span>
      <span className="mt-2 flex flex-wrap items-center gap-1.5"><StatusPill status={row.status} short/><DueSoon urgency={row.urgency} label={row.deadlineLabel}/></span>
    </span>
    <strong className="shrink-0 text-right font-display text-sm tabular-nums text-heading">{row.amount}</strong>
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 shrink-0 text-muted"><path d="m9 6 6 6-6 6"/></svg>
  </Link>;
}
