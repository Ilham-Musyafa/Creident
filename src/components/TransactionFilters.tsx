'use client';
import { TRANSACTION_FILTERS, type TransactionFilter } from './transactionsView';
export function TransactionFilters({ selected, count, onChange }: { selected: TransactionFilter; count: (filter: TransactionFilter) => number; onChange: (filter: TransactionFilter) => void }) {
  return <div role="group" aria-label="Filter deals" className="transaction-segments mb-4 flex flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
    {(Object.keys(TRANSACTION_FILTERS) as TransactionFilter[]).map(key => <button key={key} type="button" aria-pressed={selected === key} onClick={() => onChange(key)} className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-sm! font-semibold ${selected === key ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:bg-surface'}`}>
      {TRANSACTION_FILTERS[key]} <span className="text-xs tabular-nums">({count(key)})</span>
    </button>)}
  </div>;
}
