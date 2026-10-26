'use client';
import { useEffect, useState, type ReactNode } from 'react';

/** One copy of secondary content: collapsed on phones, always expanded on desktop. */
export function DealDisclosure({ title, children }: { title: string; children: ReactNode }) {
  const [desktop, setDesktop] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return <details className="deal-card deal-disclosure" open={desktop || expanded}
    onToggle={event => { if (!desktop) setExpanded(event.currentTarget.open); }}>
    <summary tabIndex={desktop ? -1 : undefined} onClick={event => { if (desktop) event.preventDefault(); }}
      className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-bold text-heading lg:cursor-default [&::-webkit-details-marker]:hidden">
      {title}<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5 shrink-0 lg:hidden"><path d="m6 9 6 6 6-6"/></svg>
    </summary>
    <div className="pt-3">{children}</div>
  </details>;
}
