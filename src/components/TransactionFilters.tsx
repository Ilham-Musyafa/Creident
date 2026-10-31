'use client';
import { useEffect, useRef } from 'react';
import type { Role } from './view';
import { transactionFilterKeys, TRANSACTION_FILTERS, type TransactionFilter } from './transactionsView';
export function TransactionFilters({ role, selected, count, onChange }: { role?: Role; selected: TransactionFilter; count: (filter: TransactionFilter) => number; onChange: (filter: TransactionFilter) => void }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = container.current;
    const active = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !active || window.innerWidth >= 1024) return;
    const left = active.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft;
    // Scroll this strip only, without moving the page or stealing focus.
    if (left < row.scrollLeft) row.scrollLeft = left;
    else if (left + active.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollLeft = left + active.offsetWidth - row.clientWidth + 16;
  }, [selected]);
  return <div ref={container} role="group" aria-label="Filter deals" className="transaction-segments mb-4 flex flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
    {transactionFilterKeys(role, count('draft')).map(key => <button key={key} type="button" aria-pressed={selected === key} onClick={() => onChange(key)} className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-sm! font-semibold ${selected === key ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:bg-surface'}`}>
      {TRANSACTION_FILTERS[key]} <span className="text-xs tabular-nums">({count(key)})</span>
    </button>)}
  </div>;
}
