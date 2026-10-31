import { JoinDeal } from './JoinDeal';
import { demoName } from './presentationCopy';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { MobileBrandHeader } from './MobileBrandHeader';
import { MobilePanel } from './MobilePanel';
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
const pill = 'inline-flex min-h-11 items-center justify-center gap-1 rounded-full px-4 text-sm font-semibold hover:opacity-90';

const STEPS: { icon: 'transactions' | 'actions' | 'records'; title: string; text: string }[] = [
  { icon: 'records', title: 'Agree terms', text: 'Buyer and seller confirm the deal terms.' },
  { icon: 'transactions', title: 'Ship & check', text: 'The seller ships; the buyer checks the item.' },
  { icon: 'actions', title: 'A person reviews problems', text: 'If something is wrong, a reviewer decides using the rules.' },
];

export function MobileHome(props: HomeData) {
  const allVerified = props.total > 0 && props.verified === props.total;
  const next = props.actions[0];
  const recent = props.recent.slice(0, 3);
  const [, inProgress, problem, closed] = props.statusTiles;
  const accent = next?.status === 'DISPUTED' || next?.status === 'UNDER_REVIEW' ? 'border-l-[var(--disputed-text)]' : 'border-l-[var(--awaiting-text)]';

  return <div className="mobile-home lg:hidden">
    <MobileBrandHeader role={props.role} compact={false}>
      <h1 className="mt-2 text-sm font-medium! tracking-normal! text-hero-text">Hi, {demoName(props.role)}</h1>
    </MobileBrandHeader>

    <MobilePanel className="pt-3!">
      {props.verified < props.total && <p role="alert" className="mb-5 rounded-xl border border-[var(--warning-line)] bg-[var(--warning-bg)] p-4 text-sm text-[var(--warning-text)]">Some record checks failed. <Link href="/audit" className="inline-flex min-h-11 items-center font-semibold underline">Inspect deal history.</Link></p>}
      <section aria-label="Overview" className="rounded-3xl bg-gradient-to-br from-[#0B1F4B] to-[#3B82F6] p-5 text-white shadow-lg">
        <p className="text-sm font-medium text-[#DBEAFE]">Needs your action</p>
        <Link href="/deals?filter=action" aria-label={`${props.actionCount} deals need your action`} className="mt-1 block text-5xl font-bold tabular-nums">{props.actionCount}</Link>
        <p className="mt-2 text-sm text-[#DBEAFE]">{inProgress?.count ?? 0} in progress · {problem?.count ?? 0} problem · {closed?.count ?? 0} closed</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {props.role === 'seller' && <Link href="/deals/new" className={`${pill} bg-white text-[#0B1F4B]`}><span aria-hidden="true">+</span> New deal</Link>}
          <Link href="/deals" className={`${pill} border border-white/40 text-white`}>Transactions</Link>
          {props.role === 'buyer' && <JoinDeal className={`${pill} bg-white text-[#0B1F4B]`}/>}
        </div>
      </section>

      {props.total === 0 ? <>
        <section className="mt-4 rounded-[24px] border border-line bg-surface p-5"><h2 className="text-base text-heading">Explore your first transaction</h2><p className="mb-4 mt-2 text-sm leading-relaxed text-muted">Load labelled examples to try payments, delivery and dispute review.</p><SeedButton role={props.role}/></section>
        <section aria-label="How it works" className="mt-4 rounded-[24px] border border-line bg-surface p-5"><h2 className="text-base text-heading">How it works</h2>
          <ol className="mt-3 space-y-3">{STEPS.map(step => <li key={step.title} className="flex items-start gap-3"><span aria-hidden="true" className="mobile-quick-icon grid size-10 shrink-0 place-items-center rounded-full"><HomeIcon name={step.icon}/></span><span><span className="block text-sm font-semibold text-heading">{step.title}</span><span className="block text-sm text-muted">{step.text}</span></span></li>)}</ol>
          <Link href="/how-it-works" className={`${textAction} mt-2 -ml-2`}>Read how it works</Link>
        </section>
      </> : <>
        <h2 className="mt-5 text-base text-heading">Your next step</h2>
        <Link href={next?.href ?? '/deals'} className={`mt-2 flex min-h-16 items-center gap-3 rounded-[20px] border border-line border-l-4 bg-surface p-3 hover:bg-surface-2 ${next ? accent : 'border-l-[var(--completed-text)]'}`}>
          <span aria-hidden="true" className="mobile-quick-icon grid size-10 shrink-0 place-items-center rounded-full">{next ? <TransactionIcon name={next.icon}/> : <HomeIcon name="actions"/>}</span>
          <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold leading-snug text-heading">{next ? next.title : 'You’re all caught up'}</span>
            <span className="mt-0.5 block text-sm text-muted">{next ? `${next.nextStep}${next.deadlineLabel ? ` · ${shortDeadline(next.deadlineLabel)}` : ''}` : 'No actions waiting'}</span></span>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0 text-muted"><path d="m9 6 6 6-6 6"/></svg>
        </Link>

        {recent.length > 0 && <section aria-labelledby="mobile-your-deals" className="mt-5">
          <div className="flex items-center justify-between gap-2 pb-1"><h2 id="mobile-your-deals" className="text-base text-heading">{props.recentTitle === 'Review queue' ? 'Review queue' : 'Your deals'}</h2><Link href="/deals" className={textAction}>See all</Link></div>
          <ul aria-label="Your deals" className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface">{recent.map(row => <li key={row.id}><MobileTransactionRow row={row} compact/></li>)}</ul>
        </section>}

        <Link href="/audit" className={`mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 py-2 text-center text-xs ${allVerified ? 'text-[var(--success-text)]' : 'bg-[var(--warning-bg)] text-[var(--warning-text)]'}`}><HomeIcon name="records"/><span>{allVerified ? `Deal history verified ✓ ${props.verified} of ${props.total}` : `Verification warning · ${props.verified} of ${props.total} deal history verified`}<span className="sr-only">. Checked on this server.</span></span></Link>
      </>}
      <footer className="mt-3 border-t border-line pt-4 text-xs leading-relaxed text-muted"><p>{props.simulated ? "Demo mode (no real money)" : 'PayPal Sandbox'} · Demo data · No real money moves.</p><Link href="/about#limitations" className="inline-flex min-h-11 items-center text-sm font-semibold text-heading">View limitations</Link></footer>
    </MobilePanel>
  </div>;
}
