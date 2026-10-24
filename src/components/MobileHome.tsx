'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { QuickRoleSwitch } from './QuickRoleSwitch';
import { DemoGuide } from './DemoGuide';
import { SeedButton } from './client';
import { MobileTransactionRow } from './MobileTransactionRow';
import type { HomeData } from './homeTypes';

const pill = 'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold';
export function MobileHome(props: HomeData) {
  const [view, setView] = useState<'overview' | 'actions' | 'about'>('overview');
  const openView = (next: typeof view) => { setView(next); requestAnimationFrame(() => document.getElementById('mobile-home-content')?.focus()); };
  const primaryHref = props.role === 'seller' ? '/deals/new' : props.role === 'reviewer' ? '/deals?filter=review' : '/deals';
  const primaryLabel = props.role === 'seller' ? 'Create a deal' : props.role === 'reviewer' ? 'Review queue' : 'View transactions';
  const allVerified = props.total > 0 && props.verified === props.total;
  return <div className="lg:hidden">
    <header className="mb-5 flex items-center justify-between gap-2">
      <div className="-ml-3 hidden min-[360px]:block"><BrandLogo/></div><div className="-ml-3 min-[360px]:hidden"><BrandLogo symbolOnly/></div>
      <QuickRoleSwitch current={props.role}/>
    </header>
    <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-medium text-muted">Your demo workspace</p><h1 className="mt-1 text-2xl text-heading">{view === 'actions' ? 'Your next steps' : view === 'about' ? 'About Creident' : 'Overview'}</h1></div><button type="button" aria-label={view === 'overview' ? 'About this demo' : 'Back to overview'} aria-controls="mobile-home-content" onClick={() => openView(view === 'overview' ? 'about' : 'overview')} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-heading"><span aria-hidden="true" className="text-lg">{view === 'overview' ? 'i' : '←'}</span></button></div>
    {props.verified < props.total && <p role="alert" className="mb-4 rounded-xl border border-[var(--warning-line)] bg-[var(--warning-bg)] p-4 text-sm text-[var(--warning-text)]">Some audit checks failed. Open Deal records to inspect them.</p>}
    <section id="mobile-home-content" tabIndex={-1} aria-label={view === 'actions' ? props.actionTitle : view === 'about' ? 'About this demo' : 'Mobile overview'} className="space-y-6">
      {view === 'about' ? <DemoGuide simulated={props.simulated} idPrefix="mobile" dashboardId="mobile-home-content" onDismiss={() => setView('overview')}/> : <>
        {view === 'overview' && <>
          <section className="mobile-approval-card rounded-[24px] border border-line p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><p className="max-w-48 text-sm font-medium">Approved payments</p><span className="rounded-full border border-current/20 px-2.5 py-1 text-xs font-semibold">USD</span></div>
            <p className="mt-2 text-[36px] font-bold leading-tight tabular-nums">{props.approvedAmount}</p>
            <p className="mt-2 text-sm">Not charged yet · {props.approvedCount} open approvals</p>
            <Link href={primaryHref} className={`${pill} mt-5 bg-strong text-on-strong`}>{primaryLabel}<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="ml-3 size-4"><path d="M5 19 19 5M5 5h14v14"/></svg></Link>
          </section>
          {props.total === 0 && <div className="rounded-[22px] border border-line bg-surface p-5"><h2 className="text-base text-heading">Explore your first transaction</h2><p className="mb-4 mt-2 text-sm text-muted">Load labelled examples to try payments, delivery and dispute review.</p><SeedButton role={props.role}/></div>}
        </>}
        <section><div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-base text-heading">{props.actionTitle} <span className="text-muted">({props.actionCount})</span></h2>{view === 'overview' ? <button type="button" onClick={() => openView('actions')} className={`${pill} px-2 text-heading`}>See all</button> : <Link href="/deals?filter=action" className={`${pill} px-2 text-heading`}>All actions</Link>}</div>
          {props.actions.length ? <ul aria-label="Pending actions" className="overflow-hidden rounded-[22px] border border-line bg-surface divide-y divide-line">{props.actions.slice(0, view === 'overview' ? 2 : 6).map(row => <li key={row.id}><MobileTransactionRow row={row}/></li>)}</ul> : <p className="rounded-[22px] border border-line bg-surface p-5 text-sm text-muted">You’re all caught up. No actions are waiting for this role.</p>}
          {view === 'actions' && props.actionCount > props.actions.length && <p className="mt-3 text-sm text-muted">Showing {props.actions.length} of {props.actionCount} actions.</p>}
        </section>
        {view === 'overview' && <>
          <section aria-label="Transaction overview"><h2 className="mb-3 text-base text-heading">At a glance</h2><div className="grid grid-cols-3 gap-2">{[['Active', props.active], ['In dispute', props.inDispute], ['Completed', props.completed]].map(([label, count]) => <div key={label} className="rounded-[18px] border border-line bg-surface p-3"><p className="text-2xl font-bold tabular-nums text-heading">{count}</p><p className="mt-1 text-xs text-muted">{label}</p></div>)}</div></section>
          <Link href="/audit" className="flex items-center gap-3 rounded-[22px] border border-line bg-surface p-4"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-heading">{allVerified ? '✓' : 'i'}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-heading">Deal records</span><span className={`mt-1 block text-sm ${props.total === 0 ? 'text-muted' : allVerified ? 'text-[var(--success-text)]' : 'text-[var(--warning-text)]'}`}>{props.total === 0 ? 'No records yet' : `${props.verified} of ${props.total} chains verified on this server`}</span></span><span aria-hidden="true" className="text-heading">›</span></Link>
        </>}
      </>}
    </section>
    <footer className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-muted"><p>{props.simulated ? 'Simulated payments' : 'PayPal Sandbox'} · Demo data</p><p>No real money moves.</p><Link href="/about#limitations" className="inline-flex min-h-11 items-center text-sm font-semibold text-heading">View limitations</Link></footer>
  </div>;
}
