import type { ReactNode } from 'react';

/** Read-only terms/fees: CSS chooses the first-paint layout, even without JavaScript. */
export function DealDisclosure({ title, children }: { title: string; children: ReactNode }) {
  return <>
    <section aria-label={title} className="deal-card deal-disclosure hidden lg:block">
      <h2 className="flex min-h-11 items-center font-bold text-heading">{title}</h2>
      <div className="pt-3">{children}</div>
    </section>
    <details className="deal-card deal-disclosure lg:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-bold text-heading [&::-webkit-details-marker]:hidden">
        {title}<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5 shrink-0"><path d="m6 9 6 6 6-6"/></svg>
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  </>;
}
