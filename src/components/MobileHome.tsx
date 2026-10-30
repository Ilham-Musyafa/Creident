'use client';

import { HomeStatusRow } from './HomeStatusRow';
import { demoName } from './presentationCopy';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { MobileBrandHeader } from './MobileBrandHeader';
import { MobilePanel } from './MobilePanel';
import { DemoGuide } from './DemoGuide';
import { SeedButton } from './client';
import { MobileTransactionRow, shortDeadline } from './MobileTransactionRow';
import { TransactionIcon } from './TransactionIcon';
import type { HomeData } from './homeTypes';

function HomeIcon({ name }: { name: 'actions' | 'transactions' | 'records' | 'about' | 'eye' | 'hidden' | 'back' }) {
  const paths: Record<typeof name, ReactNode> = {
    actions: <path d="M9 5h11M9 12h11M9 19h11m-17-14 1 1 2-2m-3 8 1 1 2-2m-3 8 1 1 2-2"/>,
    transactions: <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8m-8 6h8"/></>,
    records: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    about: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>,
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    hidden: <><path d="m3 3 18 18M10 5h2c7 0 10 7 10 7a17 17 0 0 1-3 4M6 6a18 18 0 0 0-4 6s3 7 10 7c2 0 4-.6 5-1.5M10 10a3 3 0 0 0 4 4"/></>,
    back: <path d="m15 18-6-6 6-6"/>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">{paths[name]}</svg>;
}
const textAction = 'inline-flex min-h-11 items-center justify-center gap-1 rounded-full px-2 text-sm font-semibold text-heading hover:bg-surface-2';
const primaryAction = 'flex min-h-12 items-center justify-center rounded-full bg-accent px-4 py-3 text-center text-sm! font-semibold! text-on-accent hover:opacity-90';

/** No existing equivalent: shared button/link tile content with an optional real-data count. */
function QuickTileContent({ icon, label, count }: { icon: 'actions' | 'transactions' | 'records' | 'about'; label: string; count?: number }) {
  return <><span className="mobile-quick-icon relative grid size-10 place-items-center rounded-[14px]"><HomeIcon name={icon}/>{count !== undefined && count > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-semibold tabular-nums text-on-accent">{count}</span>}</span><span className="text-sm font-medium text-heading">{label}</span></>;
}
const quickTile = 'flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] bg-surface px-1 py-2 hover:bg-surface-2';

export function MobileHome(props: HomeData) {
  const [view, setView] = useState<'overview' | 'actions' | 'about'>('overview');
  const openView = (next: typeof view) => {
    setView(next);
    requestAnimationFrame(() => document.getElementById('mobile-home-content')?.focus({ preventScroll: true }));
  };
  const primaryHref = props.role === 'seller' ? '/deals/new' : props.role === 'reviewer' ? '/deals?filter=review' : '/deals';
  const primaryLabel = props.role === 'seller' ? 'New deal' : props.role === 'reviewer' ? 'Review queue' : 'Your actions';
  const allVerified = props.total > 0 && props.verified === props.total;
  const next = props.actions[0];
  const recent = props.recent.slice(0, 3);

  return <div className="mobile-home lg:hidden">
    <MobileBrandHeader role={props.role} compact={false}>
      <h1 className="mt-2 text-sm font-medium! tracking-normal! text-hero-text">Hi, {demoName(props.role)}</h1>
      <div aria-label="Home shortcuts" className="mt-3 grid grid-cols-2 gap-3">
        {props.role === 'buyer' ? <button type="button" onClick={() => openView('actions')} className="mobile-header-pill"><HomeIcon name="actions"/>{primaryLabel}</button> : <Link href={primaryHref} className="mobile-header-pill">{props.role === 'seller' ? <span aria-hidden="true">+</span> : <HomeIcon name="actions"/>}{primaryLabel}</Link>}
        <Link href="/deals" className="mobile-header-pill"><HomeIcon name="transactions"/>Browse</Link>
      </div>
    </MobileBrandHeader>

    <MobilePanel className="pt-3!">
      {props.verified < props.total && <p role="alert" className="mb-5 rounded-xl border border-[var(--warning-line)] bg-[var(--warning-bg)] p-4 text-sm text-[var(--warning-text)]">Some record checks failed. <Link href="/audit" className="inline-flex min-h-11 items-center font-semibold underline">Inspect deal history.</Link></p>}
      <section id="mobile-home-content" tabIndex={-1} aria-label={view === 'actions' ? props.actionTitle : view === 'about' ? 'About this demo' : 'Mobile overview'}>
        {view !== 'overview' && <div className="mb-5 flex items-center gap-3"><button type="button" aria-label="Back to overview" onClick={() => openView('overview')} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-heading"><HomeIcon name="back"/></button><h2 className="text-xl text-heading">{view === 'actions' ? 'Your next steps' : 'About Creident'}</h2></div>}
        {view === 'about' ? <DemoGuide simulated={props.simulated} idPrefix="mobile" dashboardId="mobile-home-content" onDismiss={() => openView('overview')}/> : view === 'actions' ? <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-base text-heading">{props.actionTitle} ({props.actionCount})</h3><Link href="/deals?filter=action" className={textAction}>All actions</Link></div>
          {props.actions.length ? <ul aria-label="Pending actions" className="divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-surface">{props.actions.map(row => <li key={row.id}><MobileTransactionRow row={row}/></li>)}</ul> : <p className="rounded-[24px] border border-line bg-surface p-5 text-sm text-muted">You’re all caught up. No actions are waiting for this role.</p>}
          {props.actionCount > props.actions.length && <p className="mt-3 text-sm text-muted">Showing {props.actions.length} of {props.actionCount} actions.</p>}
        </> : <>
          <HomeStatusRow tiles={props.statusTiles}/>
          <nav aria-label="Quick actions" className="grid grid-cols-4 gap-2">
            <button type="button" onClick={() => openView('actions')} className={quickTile}><QuickTileContent icon="actions" label="Actions" count={props.actionCount}/></button>
            <Link href="/deals" aria-label="Browse transactions" className={quickTile}><QuickTileContent icon="transactions" label="Browse"/></Link>
            <Link href="/audit" className={quickTile}><QuickTileContent icon="records" label="Deal history"/></Link>
            <button type="button" onClick={() => openView('about')} className={quickTile}><QuickTileContent icon="about" label="About"/></button>
          </nav>

          <h2 className="mt-4 text-base text-heading">Your next step</h2>
          {props.total === 0 ? <section className="mt-5 rounded-[24px] border border-line bg-surface p-5"><h2 className="text-base text-heading">Explore your first transaction</h2><p className="mb-4 mt-2 text-sm leading-relaxed text-muted">Load labelled examples to try payments, delivery and dispute review.</p><SeedButton role={props.role}/></section> : <section aria-label="Your next step" className={`mt-3 flex items-center gap-2 rounded-[20px] border border-line bg-surface p-3 ${next ? 'border-l-4 border-l-[var(--awaiting-text)]' : ''}`}>
            <span aria-hidden="true" className="mobile-quick-icon grid size-9 shrink-0 place-items-center rounded-xl">{next ? <TransactionIcon name={next.icon}/> : <HomeIcon name="actions"/>}</span>
            <div className="min-w-0 flex-1"><h2 className="text-sm leading-snug text-heading">{next ? next.nextStep === 'Confirm or report a problem' ? 'Your next step: inspect your item' : next.nextStep : 'You’re all caught up'}</h2><p className="mt-0.5 break-words text-sm text-muted">{next ? next.title : 'No actions waiting'}</p>{next?.deadlineLabel && <p title={next.deadlineLabel} className="mt-0.5 text-xs text-[var(--awaiting-text)]">{shortDeadline(next.deadlineLabel)}</p>}</div>
            <Link href={next?.href ?? primaryHref} className={`${primaryAction} min-w-20 max-w-28 shrink-0 px-3! py-2!`}>{next ? next.nextStep === 'Confirm or report a problem' ? 'Inspect now' : next.nextStep === 'Review dispute' ? 'Review now' : next.nextStep : props.role === 'seller' ? 'New deal' : 'Browse'}</Link>
          </section>}


          {recent.length > 0 && <section aria-labelledby="mobile-your-deals" className="mt-3">
            <div className="flex items-center justify-between gap-2 pb-1"><h2 id="mobile-your-deals" className="text-base text-heading">Your deals</h2><Link href="/deals" className={textAction}>See all</Link></div>
            {props.role === 'reviewer' && props.recentTitle === 'Review queue' && <p className="pb-2 text-xs text-muted">From your review queue</p>}
            <ul aria-label="Your deals" className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface">{recent.map(row => <li key={row.id}><MobileTransactionRow row={row} compact/></li>)}</ul>
          </section>}

          <Link href="/audit" className={`mt-1 flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 py-2 text-center text-xs ${props.total === 0 ? 'text-muted' : allVerified ? 'text-[var(--success-text)]' : 'bg-[var(--warning-bg)] text-[var(--warning-text)]'}`}><HomeIcon name="records"/><span>{props.total === 0 ? "No deal history yet" : allVerified ? `Deal history verified ✓ ${props.verified} of ${props.total}` : `Verification warning · ${props.verified} of ${props.total} deal history verified`}<span className="sr-only">. Checked on this server.</span></span></Link>
        </>}
      </section>
      <footer className="mt-3 border-t border-line pt-4 text-xs leading-relaxed text-muted"><p>{props.simulated ? "Demo mode (no real money)" : 'PayPal Sandbox'} · Demo data · No real money moves.</p><Link href="/about#limitations" className="inline-flex min-h-11 items-center text-sm font-semibold text-heading">View limitations</Link></footer>
    </MobilePanel>
  </div>;
}
