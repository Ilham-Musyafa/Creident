'use client';
import { CategoryChip } from './CategoryChip';


import { HomeStatusRow } from './HomeStatusRow';
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
function Rows({ rows, title, actions = false }: { rows: TransactionRow[]; title: string; actions?: boolean }) {
  return <ul aria-label={title} className="divide-y divide-line">{rows.map(row => <li key={row.id}>
    <Link href={actions ? row.href : `/deals/${row.id}`} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] items-center gap-5 rounded-xl p-4 hover:bg-surface-2">
      <span className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-heading"><TransactionIcon name={row.icon}/></span><span className="min-w-0"><span className="block break-words text-sm font-semibold text-heading">{row.title}</span><CategoryChip category={row.category} subcategory={row.subcategory}/></span></span>
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
      <button type="button" aria-controls="desktop-home-content" aria-expanded={view === 'about'} onClick={() => setView(view === 'about' ? 'overview' : 'about')} className={`${button} border border-line bg-surface text-heading hover:bg-surface-2`}>About this demo</button>
    </header>
    <div role="group" aria-label="Home views" className="mb-6 inline-flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
      {(['overview', 'actions', 'recent', 'audit'] as const).map(key => <button key={key} type="button" aria-controls="desktop-home-content" aria-pressed={view === key} onClick={() => setView(key)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${view === key ? 'bg-surface-2 text-heading' : 'text-muted hover:text-heading'}`}>{key === 'actions' ? `Actions (${props.actionCount})` : key === 'recent' ? props.recentTitle : key === 'audit' ? "Deal history" : 'Overview'}</button>)}
    </div>
    <p role="status" className="sr-only">{titles[view]} view</p>
    {props.verified < props.total && <p role="alert" className="mb-4 rounded-xl border border-warning-line bg-warning-bg p-4 text-sm text-warning-text">Some record checks failed. Open Deal history to inspect them.</p>}
    <section id="desktop-home-content" aria-label={titles[view]} tabIndex={-1}>
      {view === 'about' && <DemoGuide simulated={props.simulated} idPrefix="desktop" dashboardId="desktop-home-content" onDismiss={() => setView('overview')}/>}
      {view === 'overview' && <div className="space-y-6">
        <div className="flex flex-wrap gap-3"><Link href="/deals" className={`${button} ${props.role !== 'buyer' ? 'border border-line text-heading' : 'bg-accent text-on-accent'}`}>View deals</Link>
          {props.role === 'seller' ? <Link href="/deals/new" className={`${button} bg-accent text-on-accent`}><span aria-hidden="true">+</span> New deal</Link> : props.role === 'reviewer' && <Link href={primaryHref} className={`${button} bg-accent text-on-accent`}>{primaryText}</Link>}
        </div>
        <HomeStatusRow tiles={props.statusTiles}/>
        <section className="rounded-[24px] border border-line bg-surface p-6"><h2 className="text-lg text-heading">Your next step</h2>
          {props.actions[0] ? <div className="mt-4"><Rows rows={props.actions.slice(0, 1)} title="Most urgent action" actions/></div> : <p className="mt-3 text-sm text-muted">You’re all caught up. No actions waiting.</p>}
        </section>
        <section className="rounded-[24px] border border-line bg-surface p-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg text-heading">Your deals</h2><Link href="/deals" className={button}>See all</Link></div><Rows rows={props.recent.slice(0, 3)} title="Your deals"/></section>
        {props.total === 0 && <SeedButton role={props.role}/>}
      </div>}
      {view === 'actions' && <div className="rounded-[24px] border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-heading">{props.actionTitle}</h2><p className="mt-1 text-sm text-muted">Nearest deadlines first. Open a deal to continue.</p></div><Link href="/deals?filter=action" className={`${button} border border-line text-heading hover:bg-surface-2`}>View all actions</Link></div>
        {props.actions.length ? <Rows rows={props.actions} title="Pending actions" actions/> : <p className="py-8 text-sm text-muted">No actions are waiting for this role.</p>}
        {props.actionCount > props.actions.length && <p className="mt-4 text-sm text-muted">Showing {props.actions.length} of {props.actionCount} actions.</p>}
      </div>}
      {view === 'recent' && <div className="rounded-[24px] border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-xl font-bold text-heading">{props.recentTitle}</h2><Link href={props.recentTitle === 'Review queue' ? '/deals?filter=review' : '/deals'} className={`${button} border border-line text-heading hover:bg-surface-2`}>See all</Link></div>
        {props.recent.length ? <Rows rows={props.recent} title={props.recentTitle}/> : <p className="py-8 text-sm text-muted">No deals to show yet.</p>}
      </div>}
      {view === 'audit' && <div className="rounded-[24px] border border-line bg-surface p-7">
        <h2 className="text-xl font-bold text-heading">Deal history</h2>
        <p className={`mt-5 text-2xl font-bold ${props.total === 0 ? 'text-muted' : props.verified === props.total ? 'text-success-text' : 'text-warning-text'}`}>{props.total === 0 ? "No deal history yet" : `${props.verified} of ${props.total} deal history verified on this server`}</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">Deal history are checked for changes on this server. Its owner could still replace the data; someone who keeps a trusted copy published elsewhere can compare it to spot later changes.</p>
        <Link href="/audit" className={`${button} mt-6 border border-line text-heading hover:bg-surface-2`}>Open Deal history</Link>
      </div>}
    </section>
    <footer className="mt-7 flex items-center justify-between gap-5 border-t border-line pt-4 text-sm text-muted"><p>{props.simulated ? "Demo mode (no real money)" : 'PayPal Sandbox'} · Demo data · No real money moves.</p><Link href="/about#limitations" className="inline-flex min-h-11 items-center font-semibold text-heading hover:underline">Limitations</Link></footer>
  </div>;
}
