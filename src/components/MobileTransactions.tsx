'use client';
import { DraftRowMenu } from './DraftRowMenu';
import { TransactionFilters } from './TransactionFilters';

import { MobilePanel } from './MobilePanel';

import { useEffect, useState } from 'react';
import { MobileBrandHeader } from './MobileBrandHeader';
import { MobileTransactionRow } from './MobileTransactionRow';
import { SeedButton } from './client';
import { TRANSACTION_FILTERS, matchesTransactionFilter, groupTransactionRows, type TransactionRow, type TransactionFilter } from './transactionsView';
import type { Role } from './view';

export function MobileTransactions({ role, rows, searched, visible, query, filter, update, now }: {
  now: string; role: Role; rows: TransactionRow[]; searched: TransactionRow[]; visible: TransactionRow[]; query: string;
  filter: TransactionFilter; update: (filter: TransactionFilter, query: string) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(Boolean(query));
  useEffect(() => { if (query) setSearchOpen(true); }, [query]);
  const toggleSearch = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) requestAnimationFrame(() => document.getElementById('mobile-transaction-search')?.focus({ preventScroll: true }));
  };
  const groups = groupTransactionRows(visible, now);
  const count = (key: TransactionFilter) => searched.filter(row => matchesTransactionFilter(row, key, role)).length;
  const actionCount = count('action');
  return <div className="lg:hidden">
    <MobileBrandHeader role={role}/>
    <MobilePanel>
      <header className="mb-5 flex items-center justify-between gap-3"><div><h1 className="text-[28px] leading-tight text-heading">Transactions</h1><p className="mt-1 text-sm text-muted">Your deals and next steps.</p></div><button type="button" aria-label="Search transactions" aria-expanded={searchOpen} aria-controls="mobile-search-panel" onClick={toggleSearch} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-bg text-heading hover:bg-surface-2"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg></button></header>
      <div id="mobile-search-panel" hidden={!searchOpen}>
      <label htmlFor="mobile-transaction-search" className="sr-only">Find a deal</label>
      <div className="relative"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-4 top-3.5 size-5 text-muted"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><input id="mobile-transaction-search" type="search" maxLength={200} value={query} onChange={event => update(filter, event.target.value)} placeholder="Search transactions" className="min-h-12 w-full rounded-full border border-line bg-bg pl-11 pr-4 text-sm! text-text placeholder:text-muted"/></div>
      </div>
      <TransactionFilters role={role} selected={filter} count={count} onChange={key => update(key, query)}/>

      <section aria-label="Transaction summary" className="mt-3 rounded-[18px] border border-line bg-bg px-4 py-3">
        <p className="flex items-baseline justify-between gap-3 text-sm text-heading"><span>{filter === 'all' ? 'All transactions' : TRANSACTION_FILTERS[filter]}</span><strong className="shrink-0 tabular-nums">{visible.length} deals</strong></p>
        <p className="mt-1 text-xs text-muted">{actionCount} need action · {count('active')} active · {count('closed')} closed</p>
      </section>
      <div className="mb-3 mt-2 flex flex-wrap items-center justify-between gap-2"><p role="status" aria-live="polite" className="text-sm text-muted">Showing {visible.length} of {rows.length} deals</p>{(query || filter !== 'all') && <button type="button" onClick={() => update('all', '')} className="min-h-11 text-sm! font-semibold text-heading">Clear filters</button>}</div>
      {rows.length === 0 ? <section className="rounded-[22px] border border-dashed border-line bg-bg p-5"><h2 className="text-base text-heading">No deals yet</h2><p className="mb-4 mt-2 text-sm text-muted">Load labelled demo deals to explore every status.</p><SeedButton role={role}/></section> : visible.length === 0 ? <section className="rounded-[22px] border border-dashed border-line bg-bg p-5"><h2 className="text-base text-heading">No matching deals</h2><p className="mt-2 text-sm text-muted">Try another item name or clear the filters.</p></section> : null}
      <div className="space-y-6">{groups.filter(group => group.rows.length).map(group => <section key={group.title}><h2 className="mb-3 text-sm text-heading">{group.title} <span className="font-normal text-muted">({group.rows.length})</span></h2><ul aria-label={group.title} className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-bg">{group.rows.map(row => <li key={row.id} data-deal-id={row.id}><MobileTransactionRow row={row}/>{role === 'seller' && row.editable && <DraftRowMenu id={row.id}/>}</li>)}</ul></section>)}</div>
      <p className="mt-6 border-t border-line pt-4 text-sm leading-relaxed text-muted">Demo deals · No real money moves.</p>
    </MobilePanel>
  </div>;
}
