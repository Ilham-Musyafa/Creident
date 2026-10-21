'use client';
export function SegmentedControl<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return <div role="group" aria-label={label} className="inline-flex flex-wrap rounded-full bg-surface-2 p-1">{options.map(option => <button key={option} type="button" aria-pressed={option === value} onClick={() => onChange(option)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${option === value ? 'bg-surface text-heading ring-1 ring-line' : 'text-muted hover:text-heading'}`}>{option}</button>)}</div>;
}
