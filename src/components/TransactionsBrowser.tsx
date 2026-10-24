'use client';

import Link from 'next/link';
import { MobileTransactions } from './MobileTransactions';
import { useEffect, useState } from 'react';
import { EmptyState } from './layout';
import { StatusPill } from './ui';
import { TransactionIcon } from './TransactionIcon';
import { TRANSACTION_FILTERS, readTransactionFilter, transactionQuery, searchTransactionRows, matchesTransactionFilter, sortTransactionRows, type TransactionFilter, type TransactionRow } from './transactionsView';

export function TransactionsBrowser({ rows, initialFilter, initialQuery }: { rows: TransactionRow[]; initialFilter: TransactionFilter; initialQuery: string }) {
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState(initialQuery);
  useEffect(() => {
    const restore = () => { const params = new URLSearchParams(window.location.search); setFilter(readTransactionFilter(params.get('filter'))); setQuery(transactionQuery(params.get('q'))); };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  const update = (nextFilter: TransactionFilter, nextQuery: string) => {
    const boundedQuery = transactionQuery(nextQuery);
    setFilter(nextFilter); setQuery(boundedQuery);
    const params = new URLSearchParams();
    if (nextFilter !== 'all') params.set('filter', nextFilter);
    if (boundedQuery) params.set('q', boundedQuery);
    window.history.replaceState(null, '', `/deals${params.size ? `?${params}` : ''}`);
  };
  const searched = searchTransactionRows(rows, query);
  const visible = sortTransactionRows(searched.filter(row => matchesTransactionFilter(row, filter)));
  return <><MobileTransactions rows={rows} searched={searched} visible={visible} query={query} filter={filter} update={update}/><div className="hidden min-w-0 lg:block">
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1"><label htmlFor="transaction-search" className="mb-2 block text-sm font-semibold text-heading">Find a transaction</label><div className="relative">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-3 top-3 size-5 text-muted"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg>
        <input id="transaction-search" type="search" maxLength={200} value={query} onChange={event => update(filter, event.target.value)} placeholder="Search by item name" className="min-h-11 w-full rounded-[14px] border border-line bg-surface py-2 pl-10 pr-3 text-sm text-text placeholder:text-muted"/>
      </div></div>
      {(query || filter !== 'all') && <button type="button" onClick={() => update('all', '')} className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-heading hover:bg-surface-2">Clear filters</button>}
    </div>
    <div role="group" aria-label="Filter transactions" className="mb-4 flex flex-wrap gap-2">
      {(Object.keys(TRANSACTION_FILTERS) as TransactionFilter[]).map(key => {
        const count = searched.filter(row => matchesTransactionFilter(row, key)).length;
        return <button key={key} type="button" aria-label={`${TRANSACTION_FILTERS[key]} (${count})`} aria-pressed={key === filter} onClick={() => update(key, query)} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold ${key === filter ? 'bg-strong text-on-strong' : 'border border-line bg-surface text-heading hover:bg-surface-2'}`}><span className="text-sm">{key === 'action' ? <><span className="sm:hidden">Your actions</span><span className="hidden sm:inline">{TRANSACTION_FILTERS[key]}</span></> : TRANSACTION_FILTERS[key]}</span><span className="text-xs tabular-nums">({count})</span></button>;
      })}
    </div>
    <p role="status" aria-live="polite" className="mb-4 text-sm text-muted">Showing {visible.length} of {rows.length} transactions · Needs action first, then nearest deadline</p>
    {visible.length === 0 ? <EmptyState title="No matching transactions">Try another item name or clear the filters.</EmptyState> : <div className="lg:overflow-hidden lg:rounded-[22px] lg:border lg:border-line lg:bg-surface">
      <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_100px] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-sm font-semibold text-heading lg:grid"><span>Item</span><span>Status</span><span>Next step</span><span className="text-right">Amount</span></div>
      <ul aria-label="Transactions" className="space-y-3 lg:space-y-0">{visible.map(row => <li key={row.id} className="lg:border-b lg:border-line lg:last:border-0">
        <Link href={row.href} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 rounded-[18px] border border-line bg-surface p-4 hover:bg-surface-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_100px] lg:gap-4 lg:rounded-none lg:border-0 lg:px-5">
          <span className="col-start-1 row-start-1 flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-heading"><TransactionIcon name={row.icon}/></span><span className="min-w-0"><span className="block break-words text-sm font-bold text-heading">{row.title}</span>{row.demo && <span className="mt-1 inline-flex rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted">Demo</span>}</span></span>
          <strong className="col-start-2 row-start-1 self-start text-right text-sm tabular-nums text-heading lg:col-start-4 lg:self-center">{row.amount}</strong>
          <span className="col-span-2 col-start-1 row-start-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1"><span className="sr-only">Status: </span><StatusPill status={row.status}/></span>
          <span className="col-span-2 col-start-1 row-start-3 min-w-0 border-t border-line pt-3 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:border-0 lg:pt-0"><span className="sr-only">Next step: </span><span className={`block break-words text-sm ${row.needsAction ? 'font-semibold text-heading' : 'text-muted'}`}>{row.nextStep}</span>{row.deadlineLabel && <span className="mt-1 block text-sm text-muted">{row.deadlineLabel}</span>}</span>
        </Link>
      </li>)}</ul>
    </div>}
  </div></>;
}
