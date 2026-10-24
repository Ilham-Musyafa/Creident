'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { MobileBrandHeader } from './MobileBrandHeader';
import { DemoGuide } from './DemoGuide';
import { SeedButton } from './client';
import { MobileTransactionRow } from './MobileTransactionRow';
import type { HomeData } from './homeTypes';

function HomeIcon({ name }: { name: 'actions' | 'transactions' | 'records' | 'about' | 'eye' | 'hidden' | 'back' }) {
  const paths: Record<typeof name, ReactNode> = {
    actions: <><path d="M9 5h11M9 12h11M9 19h11m-17-14 1 1 2-2m-3 8 1 1 2-2m-3 8 1 1 2-2"/></>,
    transactions: <><path d="M7 7h14l-4-4M17 17H3l4 4M21 7l-4 4M3 17l4-4"/></>,
    records: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    about: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>,
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    hidden: <><path d="m3 3 18 18M10 5h2c7 0 10 7 10 7a17 17 0 0 1-3 4M6 6a18 18 0 0 0-4 6s3 7 10 7c2 0 4-.6 5-1.5M10 10a3 3 0 0 0 4 4"/></>,
    back: <path d="m15 18-6-6 6-6"/>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">{paths[name]}</svg>;
}
const quickAction = 'flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-2 rounded-[20px] border border-line bg-bg px-1 py-3 text-xs! font-medium! text-heading hover:bg-surface-2';
const textAction = 'inline-flex min-h-11 items-center justify-center gap-1 rounded-full px-3 text-sm font-semibold text-heading hover:bg-surface-2';

/** Mobile-only composition inspired by the owner's reference, using Creident facts. */
export function MobileHome(props: HomeData) {
  const [view, setView] = useState<'overview' | 'actions' | 'about'>('overview');
  const [amountHidden, setAmountHidden] = useState(false);
  const openView = (next: typeof view) => {
    setView(next);
    requestAnimationFrame(() => document.getElementById('mobile-home-content')?.focus({ preventScroll: true }));
  };
  const primaryHref = props.role === 'seller' ? '/deals/new' : props.role === 'reviewer' ? '/deals?filter=review' : '/deals';
  const primaryLabel = props.role === 'seller' ? 'Create a deal' : props.role === 'reviewer' ? 'Open review queue' : 'View transactions';
  const allVerified = props.total > 0 && props.verified === props.total;
  const recent = props.recent.slice(0, 3);

  return <div className="lg:hidden">
    <MobileBrandHeader role={props.role}/>

    <div className="relative -mt-8 min-h-[70dvh] rounded-t-[32px] bg-surface px-5 pb-5 pt-6">
      <h1 className="sr-only">Home</h1>
      {props.verified < props.total && <p role="alert" className="mb-5 rounded-xl border border-[var(--warning-line)] bg-[var(--warning-bg)] p-4 text-sm text-[var(--warning-text)]">Some audit checks failed. <Link href="/audit" className="font-semibold underline">Inspect deal records.</Link></p>}
      <section id="mobile-home-content" tabIndex={-1} aria-label={view === 'actions' ? props.actionTitle : view === 'about' ? 'About this demo' : 'Mobile overview'}>
        {view !== 'overview' && <div className="mb-5 flex items-center gap-3"><button type="button" aria-label="Back to overview" onClick={() => openView('overview')} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-bg text-heading"><HomeIcon name="back"/></button><h2 className="text-xl text-heading">{view === 'actions' ? 'Your next steps' : 'About Creident'}</h2></div>}
        {view === 'about' ? <DemoGuide simulated={props.simulated} idPrefix="mobile" dashboardId="mobile-home-content" onDismiss={() => setView('overview')}/> : view === 'actions' ? <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-base text-heading">{props.actionTitle} ({props.actionCount})</h3><Link href="/deals?filter=action" className={textAction}>All actions</Link></div>
          {props.actions.length ? <ul aria-label="Pending actions" className="divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-bg">{props.actions.map(row => <li key={row.id}><MobileTransactionRow row={row}/></li>)}</ul> : <p className="rounded-[24px] border border-line bg-bg p-5 text-sm text-muted">You’re all caught up. No actions are waiting for this role.</p>}
          {props.actionCount > props.actions.length && <p className="mt-3 text-sm text-muted">Showing {props.actions.length} of {props.actionCount} actions.</p>}
        </> : <>
          <section aria-label="Approved payment summary">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0"><h2 className="text-sm font-medium text-muted">Approved payments · USD</h2><p aria-live="polite" className="mt-2 break-words text-[34px] font-semibold leading-tight tracking-tight tabular-nums text-heading">{amountHidden ? <span aria-label="Amount hidden">••••••</span> : props.approvedAmount}</p></div>
              <button type="button" aria-label={amountHidden ? 'Show approved amount' : 'Hide approved amount'} aria-pressed={amountHidden} onClick={() => setAmountHidden(!amountHidden)} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-bg text-heading hover:bg-surface-2"><HomeIcon name={amountHidden ? 'hidden' : 'eye'}/></button>
            </div>
            <p className="mt-2 text-xs text-muted">Not charged yet · {props.approvedCount} open approvals</p>
            <div aria-label="Quick actions" className="mt-5 grid grid-cols-4 gap-2">
              <button type="button" onClick={() => openView('actions')} className={quickAction}><HomeIcon name="actions"/><span>Actions ({props.actionCount})</span></button>
              <Link href="/deals" aria-label="Browse transactions" className={quickAction}><HomeIcon name="transactions"/><span>Browse</span></Link>
              <Link href="/audit" className={quickAction}><HomeIcon name="records"/><span>Records</span></Link>
              <button type="button" onClick={() => openView('about')} className={quickAction}><HomeIcon name="about"/><span>About</span></button>
            </div>
            {props.role === 'buyer' && props.actionCount > 0 ? <button type="button" onClick={() => openView('actions')} className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-full bg-strong px-4 text-sm! font-semibold! text-on-strong hover:opacity-90">Review next steps</button> : <Link href={primaryHref} className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-full bg-strong px-4 text-sm! font-semibold! text-on-strong hover:opacity-90">{primaryLabel}</Link>}
          </section>

          {props.total === 0 && <section className="mt-6 rounded-[24px] border border-line bg-bg p-5"><h2 className="text-base text-heading">Explore your first transaction</h2><p className="mb-4 mt-2 text-sm text-muted">Load labelled examples to try payments, delivery and dispute review.</p><SeedButton role={props.role}/></section>}

          <section aria-label="Transaction overview" className="mt-6">
            <h2 className="text-base text-heading">Your workspace</h2>
            <dl className="mt-3 grid grid-cols-3 divide-x divide-line rounded-[24px] border border-line bg-bg py-4">{[['Active', props.active], ['In dispute', props.inDispute], ['Completed', props.completed]].map(([label, count]) => <div key={label} className="px-2 text-center"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-heading">{count}</dd></div>)}</dl>
          </section>

          <section className="mt-6 overflow-hidden rounded-[24px] border border-line bg-bg">
            <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-3"><h2 className="text-base text-heading">{props.recentTitle}</h2><Link href={props.recentTitle === 'Review queue' ? '/deals?filter=review' : '/deals'} className={textAction}>See all<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="m9 6 6 6-6 6"/></svg></Link></div>
            {recent.length ? <ul aria-label={props.recentTitle} className="divide-y divide-line">{recent.map(row => <li key={row.id}><MobileTransactionRow row={row} compact/></li>)}</ul> : <p className="p-5 text-sm text-muted">No transactions to show yet.</p>}
          </section>

          <Link href="/audit" className="mt-5 flex min-h-14 items-center gap-3 rounded-xl py-2"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-heading">{allVerified ? '✓' : 'i'}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-heading">Deal records</span><span className={`mt-1 block text-xs ${props.total === 0 ? 'text-muted' : allVerified ? 'text-[var(--success-text)]' : 'text-[var(--warning-text)]'}`}>{props.total === 0 ? 'No records yet' : `${props.verified} of ${props.total} chains verified on this server`}</span></span><span aria-hidden="true" className="text-heading">›</span></Link>
        </>}
      </section>
      <footer className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-muted"><p>{props.simulated ? 'Simulated payments' : 'PayPal Sandbox'} · Demo data · No real money moves.</p><Link href="/about#limitations" className="inline-flex min-h-11 items-center text-sm font-semibold text-heading">View limitations</Link></footer>
    </div>
  </div>;
}
