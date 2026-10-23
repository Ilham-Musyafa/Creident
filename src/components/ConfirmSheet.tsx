'use client';
// A confirmation step before any action that moves (or commits to moving) money, in the
// style of banking apps: big amount, what happens, then an explicit confirm (docs/UI.md).

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui';

export interface ConfirmDetails {
  title: string;
  /** Formatted amount, shown large. */
  amount?: string;
  amountCaption?: string;
  rows?: Array<{ label: string; value: ReactNode }>;
  note?: ReactNode;
  confirmLabel: string;
  tone?: 'accent' | 'strong';
}

export function ConfirmSheet({ details, open, busy, onConfirm, onCancel }: {
  details: ConfirmDetails; open: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 lg:items-center" onClick={() => { if (!busy) onCancel(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}
        className="hv-page w-full max-w-md rounded-t-[26px] border border-line bg-surface p-5 pb-8 shadow-xl lg:rounded-[26px] lg:pb-5">
        <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-line lg:hidden"/>
        <h2 id="confirm-title" className="text-center text-sm font-bold text-muted">{details.title}</h2>
        {details.amount && <p className="mt-2 text-center text-[34px] font-extrabold tracking-tight text-heading tabular-nums">{details.amount}</p>}
        {details.amountCaption && <p className="text-center text-sm text-muted">{details.amountCaption}</p>}
        {details.rows && details.rows.length > 0 && <dl className="mt-4 rounded-[18px] bg-surface-2 p-3">
          {details.rows.map((row) => <div key={row.label} className="flex justify-between gap-4 border-b border-dashed border-line py-2 text-sm last:border-0">
            <dt className="text-muted">{row.label}</dt><dd className="text-right font-semibold text-heading">{row.value}</dd></div>)}
        </dl>}
        {details.note && <p className="mt-3 text-sm leading-relaxed text-muted">{details.note}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
          <Button ref={confirmRef} variant={details.tone ?? 'accent'} disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : details.confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
