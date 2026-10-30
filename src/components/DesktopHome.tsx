'use client';

import { demoName } from './presentationCopy';
import Link from 'next/link';
import { useState } from 'react';
import { DemoGuide } from './DemoGuide';
import { SeedButton } from './client';
import { StatusPill } from './ui';
import { TransactionIcon } from './TransactionIcon';
import type { TransactionRow } from './transactionsView';
import type { HomeData } from './homeTypes';

type View = 'overview' | 'actions' | 'recent' | 'audit' | 'about';

const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold';
function Arrow() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>; }
function Rows({ rows, title, actions = false }: { rows: TransactionRow[]; title: string; actions?: boolean }) {
  return <ul aria-label={title} className="divide-y divide-line">{rows.map(row => <li key={row.id}>
    <Link href={actions ? row.href : `/deals/${row.id}`} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] items-center gap-5 rounded-xl p-4 hover:bg-surface-2">
      <span className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-heading"><TransactionIcon name={row.icon}/></span><span className="min-w-0"><span className="block break-words text-sm font-semibold text-heading">{row.title}</span>{row.demo && <span className="mt-1 inline-flex rounded-full border border-line px-2 py-0.5 text-xs text-muted">Demo</span>}</span></span>
      {actions ? <span className="min-w-0"><span className="block break-words text-sm font-semibold text-heading">{row.nextStep}</span>{row.deadlineLabel && <span className="mt-1 block text-sm text-muted">{row.deadlineLabel}</span>}</span> : <StatusPill status={row.status}/>}
      {actions ? <StatusPill status={row.status}/> : <strong className="text-right text-sm tabular-nums text-heading">{row.amount}</strong>}
    </Link>
  </li>)}</ul>;
}

/** Desktop-only progressive disclosure. Counts and actions come from existing stored facts. */
export function DesktopHome(props: HomeData) {
  const [view, setView] = useState<View>('overview');
  const titles: Record<View, string> = { overview: 'Overview', actions: props.actionTitle, recent: props.recentTitle, audit: "Deal history", about: 'About this demo' };
  const openActions = () => { setView('actions'); requestAnimationFrame(() => document.getElementById('desktop-home-content')?.focus()); };
  const primaryHref = props.role === 'seller' ? '/deals/new' : props.role === 'reviewer' ? '/deals?filter=review' : '/deals';
  const primaryText = props.role === 'seller' ? 'New deal' : props.role === 'reviewer' ? 'Review queue' : 'View deals';
  return <div className="hidden lg:block">
    <header className="mb-7 flex items-center justify-between gap-6">
      <div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 font-bold text-heading">{props.role[0]!.toUpperCase()}</span><div><p className="text-sm text-muted">Demo workspace</p><h1 className="mt-1 text-[28px] font-bold text-heading">Hi, {demoName(props.role)}</h1></div></div>
      <button type="button" aria-controls="desktop-home-content" aria-expanded={view === 'about'} onClick={() => setView(view === 'about' ? 'overview' : 'about')} className={`${button} border border-line bg-surface text-heading hover:bg-surface-2`}>About this demo<Arrow/></button>
    </header>
    <div role="group" aria-label="Home views" className="mb-6 inline-flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
      {(['overview', 'actions', 'recent', 'audit'] as const).map(key => <button key={key} type="button" aria-controls="desktop-home-content" aria-pressed={view === key} onClick={() => setView(key)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${view === key ? 'bg-surface-2 text-heading' : 'text-muted hover:text-heading'}`}>{key === 'actions' ? `Actions (${props.actionCount})` : key === 'recent' ? props.recentTitle : key === 'audit' ? "Deal history" : 'Overview'}</button>)}
    </div>
    <p role="status" className="sr-only">{titles[view]} view</p>
    {props.verified < props.total && <p role="alert" className="mb-4 rounded-xl border border-warning-line bg-warning-bg p-4 text-sm text-warning-text">Some record checks failed. Open Deal history to inspect them.</p>}
    <section id="desktop-home-content" aria-label={titles[view]} tabIndex={-1}>
      {view === 'about' && <DemoGuide simulated={props.simulated} idPrefix="desktop" dashboardId="desktop-home-content" onDismiss={() => setView('overview')}/>}
      {view === 'overview' && <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-6">
        <div className="rounded-[24px] border border-line bg-surface p-7">
          <p className="text-sm font-medium text-muted">Approved payments · not charged yet</p>
          <p className="mt-3 text-[44px] font-bold leading-tight tabular-nums text-heading">{props.approvedAmount}</p>
          <p className="mt-2 text-sm text-muted">Across {props.approvedCount} open approval{props.approvedCount === 1 ? '' : 's'}</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link href={primaryHref} className={`${button} bg-accent text-on-accent hover:opacity-80`}>{primaryText}<Arrow/></Link>{props.role === 'seller' && <Link href="/deals" className={`${button} border border-line text-heading hover:bg-surface-2`}>View deals</Link>}</div>
          {props.total === 0 && <div className="mt-4"><p className="mb-3 text-sm text-muted">Start with a deal or explore labelled examples.</p><SeedButton role={props.role}/></div>}
          <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-line pt-5">{[['Active', props.active], ['In dispute', props.inDispute], ['Completed', props.completed]].map(([label, value]) => <div key={label}><dt className="text-sm text-muted">{label}</dt><dd className="mt-1 text-2xl font-bold tabular-nums text-heading">{value}</dd></div>)}</dl>
        </div>
        <div className="flex flex-col rounded-[24px] bg-hero p-7 text-hero-text">
          <h2 className="text-base font-semibold">Your next steps</h2>
          <p className="mt-5 text-[52px] font-bold leading-none tabular-nums">{props.actionCount}</p>
          <p className="mt-3 text-sm text-hero-sub">{props.actionCount === 0 ? 'You’re all caught up.' : `Deal${props.actionCount === 1 ? '' : 's'} waiting for your action.`}</p>
          <div className="mt-auto pt-7">{props.actionCount > 0 ? <button type="button" onClick={openActions} className={`${button} border border-hero-sub/50 text-hero-text hover:bg-hero-text/10`}>Review actions<Arrow/></button> : <Link href="/deals" className={`${button} border border-hero-sub/50 text-hero-text hover:bg-hero-text/10`}>Browse deals<Arrow/></Link>}</div>
        </div>
      </div>}
      {view === 'actions' && <div className="rounded-[24px] border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-heading">{props.actionTitle}</h2><p className="mt-1 text-sm text-muted">Nearest deadlines first. Open a deal to continue.</p></div><Link href="/deals?filter=action" className={`${button} border border-line text-heading hover:bg-surface-2`}>View all actions<Arrow/></Link></div>
        {props.actions.length ? <Rows rows={props.actions} title="Pending actions" actions/> : <p className="py-8 text-sm text-muted">No actions are waiting for this role.</p>}
        {props.actionCount > props.actions.length && <p className="mt-4 text-sm text-muted">Showing {props.actions.length} of {props.actionCount} actions.</p>}
      </div>}
      {view === 'recent' && <div className="rounded-[24px] border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-xl font-bold text-heading">{props.recentTitle}</h2><Link href={props.recentTitle === 'Review queue' ? '/deals?filter=review' : '/deals'} className={`${button} border border-line text-heading hover:bg-surface-2`}>See all<Arrow/></Link></div>
        {props.recent.length ? <Rows rows={props.recent} title={props.recentTitle}/> : <p className="py-8 text-sm text-muted">No deals to show yet.</p>}
      </div>}
      {view === 'audit' && <div className="rounded-[24px] border border-line bg-surface p-7">
        <h2 className="text-xl font-bold text-heading">Deal history</h2>
        <p className={`mt-5 text-2xl font-bold ${props.total === 0 ? 'text-muted' : props.verified === props.total ? 'text-success-text' : 'text-warning-text'}`}>{props.total === 0 ? "No deal history yet" : `${props.verified} of ${props.total} deal history verified on this server`}</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">Deal history are checked for changes on this server. Its owner could still replace the data; someone who keeps a trusted copy published elsewhere can compare it to spot later changes.</p>
        <Link href="/audit" className={`${button} mt-6 border border-line text-heading hover:bg-surface-2`}>Open Deal history<Arrow/></Link>
      </div>}
    </section>
    <footer className="mt-7 flex items-center justify-between gap-5 border-t border-line pt-4 text-sm text-muted"><p>{props.simulated ? "Demo mode (no real money)" : 'PayPal Sandbox'} · Demo data · No real money moves.</p><Link href="/about#limitations" className="inline-flex min-h-11 items-center font-semibold text-heading hover:underline">Limitations</Link></footer>
  </div>;
}
