'use client';
import { TransactionFilters } from './TransactionFilters';
import { CategoryChip } from './CategoryChip';
import { DueSoon } from './DueSoon';


import Link from 'next/link';
import { createPortal } from 'react-dom';
import { MobileTransactions } from './MobileTransactions';
import { useEffect, useState } from 'react';
import { EmptyState } from './layoutPrimitives';
import { SeedButton } from './client';
import type { Role } from './view';
import { StatusPill } from './ui';
import { TransactionIcon } from './TransactionIcon';
import { TRANSACTION_FILTERS, shortDate, readTransactionFilter, transactionQuery, searchTransactionRows, matchesTransactionFilter, sortTransactionRows, groupTransactionRows, type TransactionFilter, type TransactionRow } from './transactionsView';

export function TransactionsBrowser({ role, rows, initialFilter, initialQuery, now }: { now: string; role: Role; rows: TransactionRow[]; initialFilter: TransactionFilter; initialQuery: string }) {
  const [searchHost, setSearchHost] = useState<HTMLElement | null>(null);
  useEffect(() => { setSearchHost(document.getElementById('desktop-transaction-search')); }, []);
  const [filter, setFilter] = useState(readTransactionFilter(initialFilter, role));
  const [query, setQuery] = useState(initialQuery);
  useEffect(() => {
    const restore = () => { const params = new URLSearchParams(window.location.search); setFilter(readTransactionFilter(params.get('filter'), role)); setQuery(transactionQuery(params.get('q'))); };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [role]);
  const update = (nextFilter: TransactionFilter, nextQuery: string) => {
    const boundedQuery = transactionQuery(nextQuery);
    setFilter(nextFilter); setQuery(boundedQuery);
    const params = new URLSearchParams();
    if (nextFilter !== 'all') params.set('filter', nextFilter);
    if (boundedQuery) params.set('q', boundedQuery);
    window.history.replaceState(null, '', `/deals${params.size ? `?${params}` : ''}`);
  };
  const searched = searchTransactionRows(rows, query);
  const visible = sortTransactionRows(searched.filter(row => matchesTransactionFilter(row, filter, role)));
  const groups = groupTransactionRows(visible, now);
  const desktopSearch = (<div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1"><label htmlFor="transaction-search" className="mb-2 block text-sm font-semibold text-heading">Find a deal</label><div className="relative">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-3 top-3 size-5 text-muted"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg>
        <input id="transaction-search" type="search" maxLength={200} value={query} onChange={event => update(filter, event.target.value)} placeholder="Search by item name" className="min-h-11 w-full rounded-[14px] border border-line bg-surface py-2 pl-10 pr-3 text-sm text-text placeholder:text-muted"/>
      </div></div>
      {(query || filter !== 'all') && <button type="button" onClick={() => update('all', '')} className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-heading hover:bg-surface-2">Clear filters</button>}
    </div>);
  return <><MobileTransactions now={now} role={role} rows={rows} searched={searched} visible={visible} query={query} filter={filter} update={update}/><div className="hidden min-w-0 lg:block">
    {searchHost ? createPortal(desktopSearch, searchHost) : desktopSearch}
    <TransactionFilters role={role} selected={filter} count={key => searched.filter(row => matchesTransactionFilter(row, key, role)).length} onChange={key => update(key, query)}/>
    <p role="status" aria-live="polite" className="mb-4 text-sm text-muted">Showing {visible.length} of {rows.length} deals</p>
    {rows.length === 0 ? <EmptyState title="No deals yet"><p className="mb-4">Load labelled demo deals to explore every status.</p><SeedButton role={role}/></EmptyState> : visible.length === 0 ? <EmptyState title="No matching deals">Try another item name or clear the filters.</EmptyState> : <div className="lg:overflow-hidden lg:rounded-[22px] lg:border lg:border-line lg:bg-surface">
      <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_100px] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-sm font-semibold text-heading lg:grid"><span>Item</span><span>Status</span><span>Next step</span><span className="text-right">Amount</span></div>
      <ul aria-label="Transactions" className="space-y-3 lg:space-y-0">{groups.flatMap(group => [<li key={`heading-${group.key}`} className="border-y border-line bg-surface-2 px-5 py-3"><h2 className="text-sm font-semibold text-heading">{group.title} <span className="font-normal text-muted">({group.rows.length})</span></h2></li>, ...group.rows.map(row => <li key={row.id} data-deal-id={row.id} className="lg:border-b lg:border-line lg:last:border-0">
        <div className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 rounded-[18px] border border-line bg-surface p-4 hover:bg-surface-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_100px] lg:gap-4 lg:rounded-none lg:border-0 lg:px-5">
          <span className="col-start-1 row-start-1 flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-heading"><TransactionIcon name={row.icon}/></span><span className="min-w-0"><Link href={row.href} className="block break-words text-sm font-bold text-heading after:absolute after:inset-0 after:content-['']">{row.title}</Link><span className="hidden lg:contents"><CategoryChip category={row.category} subcategory={row.subcategory}/></span>{shortDate(row.createdAt) && <span className="mt-1 hidden text-xs text-muted lg:block">{shortDate(row.createdAt)}</span>}{role === 'seller' && row.editable && <Link href={`/deals/${row.id}/edit`} className="relative z-10 mt-1 inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-heading hover:bg-surface-2">Edit deal</Link>}</span></span>
          <strong className="col-start-2 row-start-1 self-start text-right text-sm tabular-nums text-heading lg:col-start-4 lg:self-center">{row.amount}</strong>
          <span className="col-span-2 col-start-1 row-start-2 lg:hidden"><CategoryChip category={row.category} subcategory={row.subcategory}/></span>
          <span className="col-span-2 col-start-1 row-start-3 min-w-0 overflow-hidden lg:col-span-1 lg:col-start-2 lg:row-start-1"><span className="sr-only">Status: </span><StatusPill status={row.status} short equal className="max-w-full [overflow-wrap:anywhere]"/></span>
          {shortDate(row.createdAt) && <span className="col-span-2 col-start-1 row-start-4 text-xs text-muted lg:hidden">{shortDate(row.createdAt)}</span>}
          <span className="col-span-2 col-start-1 row-start-5 min-w-0 border-t border-line pt-3 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:border-0 lg:pt-0"><span className="sr-only">Next step: </span><span className={`block break-words text-sm ${row.needsAction ? 'font-semibold text-heading' : 'text-muted'}`}>{row.nextStep}</span>{row.deadlineLabel && <span className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted"><DueSoon urgency={row.urgency} label={row.deadlineLabel}/>{row.deadlineLabel}</span>}</span>
        </div>
      </li>)])}</ul>
    </div>}
  </div></>;
}
