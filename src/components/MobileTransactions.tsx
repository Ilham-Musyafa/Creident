'use client';

import Link from 'next/link';
import { MobileTransactionRow } from './MobileTransactionRow';
import { TRANSACTION_FILTERS, matchesTransactionFilter, type TransactionRow, type TransactionFilter } from './transactionsView';

export function MobileTransactions({ rows, searched, visible, query, filter, update }: {
  rows: TransactionRow[]; searched: TransactionRow[]; visible: TransactionRow[]; query: string;
  filter: TransactionFilter; update: (filter: TransactionFilter, query: string) => void;
}) {
  const groups = [
    { title: 'Needs your action', rows: visible.filter(row => row.needsAction) },
    { title: 'In progress', rows: visible.filter(row => !row.needsAction && row.active) },
    { title: 'Closed', rows: visible.filter(row => !row.needsAction && !row.active) },
  ];
  return <div className="lg:hidden">
    <header className="mb-5 flex items-center justify-between gap-3"><Link href="/" aria-label="Back to Home" className="grid size-11 place-items-center rounded-full border border-line bg-surface text-heading"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5"><path d="m15 18-6-6 6-6"/></svg></Link><h1 className="text-xl text-heading">Transactions</h1><span aria-hidden="true" className="size-11"/></header>
    <label htmlFor="mobile-transaction-search" className="sr-only">Find a transaction</label>
    <div className="relative"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-4 top-3.5 size-5 text-muted"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><input id="mobile-transaction-search" type="search" maxLength={200} value={query} onChange={event => update(filter, event.target.value)} placeholder="Search transactions" className="min-h-12 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-sm text-text placeholder:text-muted"/></div>
    <div role="group" aria-label="Quick filters" className="mt-4 grid grid-cols-3 gap-1 rounded-full border border-line bg-surface p-1">{(['all', 'action', 'closed'] as const).map(key => <button key={key} type="button" aria-pressed={filter === key} onClick={() => update(key, query)} className={`min-h-11 rounded-full px-2 text-xs font-semibold ${filter === key ? 'bg-strong text-on-strong' : 'text-muted'}`}>{key === 'action' ? 'Your actions' : TRANSACTION_FILTERS[key]}</button>)}</div>
    <details className="my-3 rounded-[18px] border border-line bg-surface px-4"><summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-semibold text-heading"><span>Filters · {TRANSACTION_FILTERS[filter]}</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M3 4h18l-7 8v7l-4 2V12Z"/></svg></summary><div role="group" aria-label="Filter transactions" className="flex flex-wrap gap-2 pb-4">{(Object.keys(TRANSACTION_FILTERS) as TransactionFilter[]).map(key => <button key={key} type="button" aria-pressed={filter === key} onClick={() => update(key, query)} className={`min-h-11 rounded-full border border-line px-3 text-sm ${filter === key ? 'bg-strong text-on-strong' : 'text-heading'}`}>{TRANSACTION_FILTERS[key]} ({searched.filter(row => matchesTransactionFilter(row, key)).length})</button>)}</div></details>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p role="status" aria-live="polite" className="text-xs text-muted">Showing {visible.length} of {rows.length} transactions</p>{(query || filter !== 'all') && <button type="button" onClick={() => update('all', '')} className="min-h-11 text-sm font-semibold text-heading">Clear filters</button>}</div>
    {visible.length === 0 && <div className="rounded-[22px] border border-dashed border-line bg-surface p-6"><h2 className="text-base text-heading">No matching transactions</h2><p className="mt-2 text-sm text-muted">Try another item name or clear the filters.</p></div>}
    <div className="space-y-6">{groups.filter(group => group.rows.length).map(group => <section key={group.title}><h2 className="mb-3 text-sm text-heading">{group.title} <span className="font-normal text-muted">({group.rows.length})</span></h2><ul aria-label={group.title} className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">{group.rows.map(row => <li key={row.id}><MobileTransactionRow row={row}/></li>)}</ul></section>)}</div>
  </div>;
}
