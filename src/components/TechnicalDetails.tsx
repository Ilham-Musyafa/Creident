import type { ReactNode } from 'react';

/** Plain copy first; original diagnostic values remain available on request. */
export function TechnicalDetails({ children }: { children: ReactNode }) {
  return <details className="technical-details mt-3 min-w-0 rounded-2xl border border-line text-sm [overflow-wrap:anywhere]">
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 font-semibold text-heading [&::-webkit-details-marker]:hidden"><span>Technical details</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="technical-chevron size-4 shrink-0"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div className="space-y-2 border-t border-line p-4 text-sm">{children}</div>
  </details>;
}
