'use client';

import { useRef } from 'react';

/** Edits the existing newline-delimited fields without changing the API payload. */
export function TermsListEditor({ id, label, value, onChange, maxLength }: {
  id: string; label: string; value: string; onChange: (value: string) => void; maxLength: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const rows = value.split('\n');
  const focus = (index: number) => requestAnimationFrame(() => container.current?.querySelectorAll('input')[index]?.focus());
  return <div ref={container} className="space-y-2">
    {rows.map((row, index) => <div key={index} className="flex items-center gap-2">
      <label htmlFor={`${id}-${index}`} className="sr-only">{label} {index + 1}</label>
      <input id={`${id}-${index}`} value={row}
        maxLength={Math.max(0, maxLength - (value.length - row.length))}
        className="min-h-11 min-w-0 flex-1 rounded-[14px] border border-line bg-surface px-4 text-sm text-text placeholder:text-muted"
        onChange={event => onChange(rows.map((line, i) => i === index ? event.target.value : line).join('\n'))}/>
      <button type="button" aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
        disabled={rows.length === 1 && !row}
        className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 disabled:opacity-40"
        onClick={() => { onChange(rows.filter((_, i) => i !== index).join('\n')); focus(Math.max(0, index - 1)); }}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-4"><path d="m6 6 12 12M6 18 18 6"/></svg>
      </button>
    </div>)}
    <button type="button" disabled={value.length >= maxLength}
      className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-heading hover:bg-surface-2 disabled:opacity-40"
      onClick={() => { onChange(`${value}\n`); focus(rows.length); }}>+ Add {label.toLowerCase()}</button>
  </div>;
}
