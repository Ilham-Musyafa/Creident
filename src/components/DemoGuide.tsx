'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from './view';

const steps = [
  { title: 'Agree on the terms', detail: 'Both sides accept the item checks before payment.' },
  { title: 'Approve with PayPal', detail: 'Approve first, without a charge yet.' },
  { title: 'Review with evidence', detail: 'R1–R7 guide the flow. AI summarises; a person confirms disputes.' },
];
const preference = 'creident-product-intro-dismissed';

export function DemoGuide({ simulated }: { simulated: boolean }) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    try { setVisible(localStorage.getItem(preference) !== '1'); } catch { /* Optional viewer preference. */ }
  }, []);
  const toggle = (show: boolean) => {
    setVisible(show);
    try { if (show) localStorage.removeItem(preference); else localStorage.setItem(preference, '1'); } catch { /* Optional viewer preference. */ }
  };
  const openDashboard = (role?: Role) => {
    if (role) {
      document.cookie = `hv-role=${role}; path=/; max-age=31536000; samesite=lax`;
      startTransition(() => router.refresh());
    }
    toggle(false);
    requestAnimationFrame(() => document.getElementById('demo-dashboard')?.focus());
  };
  if (!visible) return <button type="button" onClick={() => { toggle(true); requestAnimationFrame(() => document.getElementById('product-intro-title')?.focus()); }} className="mb-4 inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-heading hover:bg-surface-2">About this demo</button>;
  return <section aria-labelledby="product-intro-title" className="mb-6 rounded-[22px] border border-line bg-surface p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 max-w-2xl">
        <p className="mb-2 text-sm font-semibold text-muted">Creident · a dispute-mediation prototype</p>
        <h2 id="product-intro-title" tabIndex={-1} className="text-2xl font-bold leading-tight text-heading sm:text-[32px]">Clear terms. Evidence. Human review.</h2>
        <p className="mt-3 text-sm leading-relaxed text-text">Agree on the terms. Approve payment with PayPal. Resolve problems with evidence and human review.</p>
      </div>
      <button type="button" aria-label="Dismiss product introduction" onClick={() => openDashboard()} className="grid size-11 shrink-0 place-items-center rounded-full text-heading hover:bg-surface-2"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
    </div>
    <ol className="my-5 grid gap-3 md:grid-cols-3">
      {steps.map((step, index) => <li key={step.title} className="flex items-start gap-3 rounded-[16px] bg-surface-2 p-4">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-sm font-bold text-heading">{index + 1}</span>
        <div className="min-w-0"><h3 className="text-base font-bold text-heading">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-text">{step.detail}{index === 1 ? simulated ? ' Payment is simulated here.' : ' This uses PayPal Sandbox test payments.' : ''}</p></div>
      </li>)}
    </ol>
    <div className="flex flex-wrap gap-2">
      {(['seller', 'buyer', 'reviewer'] as const).map(role => <button key={role} type="button" disabled={pending} onClick={() => openDashboard(role)} className={`min-h-11 rounded-full px-4 text-sm font-bold disabled:opacity-60 ${role === 'seller' ? 'bg-accent text-on-accent hover:opacity-80' : 'border border-line text-heading hover:bg-surface-2'}`}>Try as {role[0]!.toUpperCase() + role.slice(1)}</button>)}
      <button type="button" onClick={() => openDashboard()} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold text-heading hover:bg-surface-2">Open dashboard</button>
    </div>
    <p className="mt-3 text-sm leading-relaxed text-muted">{simulated ? 'Simulated payments.' : 'PayPal Sandbox test payments.'} Use labelled demo data. No real money moves. Reviewer actions may require an access code. This is not an escrow service.</p>
  </section>;
}
