import type { ReactNode } from 'react';

/** Plain copy first; original diagnostic values remain available on request. */
export function TechnicalDetails({ children }: { children: ReactNode }) {
  return <details className="technical-details mt-3 min-w-0 text-sm [overflow-wrap:anywhere]">
    <summary className="flex min-h-11 cursor-pointer items-center rounded-lg font-semibold text-heading">Technical details</summary>
    <div className="space-y-2 border-t border-line pt-3 text-sm">{children}</div>
  </details>;
}
