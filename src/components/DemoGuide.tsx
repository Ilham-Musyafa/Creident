'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Step = { title: string; detail: string; href: string };

export function DemoGuide({ steps }: { steps: Step[] }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try { setVisible(localStorage.getItem('creident-demo-guide-dismissed') !== '1'); }
    catch { setVisible(true); }
  }, []);
  const toggle = (show: boolean) => {
    setVisible(show);
    try { if (show) localStorage.removeItem('creident-demo-guide-dismissed'); else localStorage.setItem('creident-demo-guide-dismissed', '1'); } catch { /* Optional viewer preference. */ }
  };
  if (!visible) return <button type="button" onClick={() => toggle(true)} className="mb-4 inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-heading hover:bg-surface-2">Try the demo</button>;
  return <section aria-label="Demo guide" className="mb-6 rounded-[22px] border border-line bg-surface p-4">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="text-[15px] font-bold text-heading">Try the demo</h2><p className="mt-1 text-xs text-muted">Explore labelled examples. Switch demo roles in Menu; no real money moves.</p></div>
      <button type="button" aria-label="Dismiss demo guide" onClick={() => toggle(false)} className="grid size-11 shrink-0 place-items-center rounded-full text-heading hover:bg-surface-2"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
    </div>
    <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => <li key={step.title}><Link href={step.href} className="flex min-h-11 items-start gap-2 rounded-xl p-2 hover:bg-surface-2"><span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-heading">{index + 1}</span><span className="min-w-0"><span className="block text-sm font-semibold text-heading">{step.title}</span><span className="mt-1 block text-xs leading-relaxed text-muted">{step.detail}</span></span></Link></li>)}
    </ol>
  </section>;
}
