'use client';

import { MobilePanel } from './MobilePanel';

import { useEffect, useState } from 'react';
import { MobileBrandHeader } from './MobileBrandHeader';
import { MobileTransactionRow } from './MobileTransactionRow';
import { SeedButton } from './client';
import { TRANSACTION_FILTERS, matchesTransactionFilter, type TransactionRow, type TransactionFilter } from './transactionsView';
import type { Role } from './view';

export function MobileTransactions({ role, rows, searched, visible, query, filter, update }: {
  role: Role; rows: TransactionRow[]; searched: TransactionRow[]; visible: TransactionRow[]; query: string;
  filter: TransactionFilter; update: (filter: TransactionFilter, query: string) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(Boolean(query));
  useEffect(() => { if (query) setSearchOpen(true); }, [query]);
  const toggleSearch = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) requestAnimationFrame(() => document.getElementById('mobile-transaction-search')?.focus({ preventScroll: true }));
  };
  const groups = [
    { title: 'Needs your action', rows: visible.filter(row => row.needsAction) },
    { title: 'In progress', rows: visible.filter(row => !row.needsAction && row.active) },
    { title: 'Closed', rows: visible.filter(row => !row.needsAction && !row.active) },
  ];
  const count = (key: TransactionFilter) => searched.filter(row => matchesTransactionFilter(row, key)).length;
  const actionCount = count('action');
  return <div className="lg:hidden">
    <MobileBrandHeader role={role}/>
    <MobilePanel>
      <header className="mb-5 flex items-center justify-between gap-3"><div><h1 className="text-[28px] leading-tight text-heading">Transactions</h1><p className="mt-1 text-sm text-muted">Your deals and next steps.</p></div><button type="button" aria-label="Search transactions" aria-expanded={searchOpen} aria-controls="mobile-search-panel" onClick={toggleSearch} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-bg text-heading hover:bg-surface-2"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg></button></header>
      <div id="mobile-search-panel" hidden={!searchOpen}>
      <label htmlFor="mobile-transaction-search" className="sr-only">Find a deal</label>
      <div className="relative"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-4 top-3.5 size-5 text-muted"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><input id="mobile-transaction-search" type="search" maxLength={200} value={query} onChange={event => update(filter, event.target.value)} placeholder="Search transactions" className="min-h-12 w-full rounded-full border border-line bg-bg pl-11 pr-4 text-sm! text-text placeholder:text-muted"/></div>
      </div>
      <div className={`relative ${searchOpen ? 'mt-3' : ''}`}>
        <label htmlFor="mobile-transaction-view" className="sr-only">Transaction view</label>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="pointer-events-none absolute left-4 top-3.5 size-5 text-[var(--inspection-text)]"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
        <select id="mobile-transaction-view" value={filter} onChange={event => update(event.target.value as TransactionFilter, query)} className="min-h-12 w-full appearance-none rounded-full border border-line bg-bg pl-12 pr-10 text-sm! font-medium text-heading">{(Object.keys(TRANSACTION_FILTERS) as TransactionFilter[]).map(key => <option key={key} value={key}>{TRANSACTION_FILTERS[key]} ({count(key)})</option>)}</select>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute right-4 top-4 size-4 text-muted"><path d="m6 9 6 6 6-6"/></svg>
      </div>

      <section aria-label="Transaction summary" className="mt-5 rounded-[24px] border border-line bg-bg p-4">
        <div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-heading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><path d="M7 7h14l-4-4M17 17H3l4 4M21 7l-4 4M3 17l4-4"/></svg></span><div className="min-w-0 flex-1"><h2 className="text-sm text-heading">{filter === 'all' ? 'All transactions' : TRANSACTION_FILTERS[filter]}</h2><p className="mt-1 text-xs text-muted">{query.trim() ? 'Matching your search' : 'In this demo workspace'}</p></div><strong className="shrink-0 text-[28px] font-semibold tabular-nums text-heading">{visible.length}</strong></div>
        <button type="button" disabled={actionCount === 0} onClick={() => update('action', query)} className="mt-4 flex min-h-12 w-full items-center gap-2 rounded-[18px] border border-line bg-surface px-3 py-3 text-left text-sm! text-heading hover:bg-surface-2 disabled:cursor-default"><span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs">{actionCount}</span><span>{actionCount ? `Deal${actionCount === 1 ? '' : 's'} waiting for your action` : 'No actions waiting for this role'}</span></button>
        <div className="mt-2 grid grid-cols-2 gap-2">{(['active', 'closed'] as const).map(key => <button key={key} type="button" aria-pressed={filter === key} onClick={() => update(key, query)} className={`flex min-h-12 items-center justify-between gap-2 rounded-[18px] border px-3 text-sm! ${filter === key ? 'border-heading bg-surface-2 text-heading' : 'border-line bg-surface text-muted hover:bg-surface-2'}`}><span>{TRANSACTION_FILTERS[key]}</span><strong className="text-heading">{count(key)}</strong></button>)}</div>
      </section>

      <div role="group" aria-label="Quick filters" className="mt-5 grid grid-cols-3 gap-1 rounded-full border border-line bg-bg p-1">{(['all', 'action', 'closed'] as const).map(key => <button key={key} type="button" aria-pressed={filter === key} onClick={() => update(key, query)} className={`min-h-11 rounded-full px-2 text-xs! font-semibold ${filter === key ? 'border border-line bg-surface text-heading shadow-sm' : 'text-muted'}`}>{key === 'action' ? 'Your actions' : TRANSACTION_FILTERS[key]}</button>)}</div>
      <div className="mb-4 mt-3 flex flex-wrap items-center justify-between gap-2"><p role="status" aria-live="polite" className="text-sm text-muted">Showing {visible.length} of {rows.length} deals</p>{(query || filter !== 'all') && <button type="button" onClick={() => update('all', '')} className="min-h-11 text-sm! font-semibold text-heading">Clear filters</button>}</div>
      {rows.length === 0 ? <section className="rounded-[22px] border border-dashed border-line bg-bg p-5"><h2 className="text-base text-heading">No deals yet</h2><p className="mb-4 mt-2 text-sm text-muted">Load labelled demo deals to explore every status.</p><SeedButton role={role}/></section> : visible.length === 0 ? <section className="rounded-[22px] border border-dashed border-line bg-bg p-5"><h2 className="text-base text-heading">No matching deals</h2><p className="mt-2 text-sm text-muted">Try another item name or clear the filters.</p></section> : null}
      <div className="space-y-6">{groups.filter(group => group.rows.length).map(group => <section key={group.title}><h2 className="mb-3 text-sm text-heading">{group.title} <span className="font-normal text-muted">({group.rows.length})</span></h2><ul aria-label={group.title} className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-bg">{group.rows.map(row => <li key={row.id}><MobileTransactionRow row={row}/></li>)}</ul></section>)}</div>
      <p className="mt-6 border-t border-line pt-4 text-sm leading-relaxed text-muted">Demo deals · No real money moves.</p>
    </MobilePanel>
  </div>;
}
