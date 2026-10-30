import { resolveDealCategory } from '../lib/dealCategories';
import { HomeStatusRow } from './HomeStatusRow';
import { demoName } from './presentationCopy';
import Link from 'next/link';
import { SeedButton } from './client';
import { StatusPill } from './ui';
import { TransactionIcon } from './TransactionIcon';
import type { TransactionRow } from './transactionsView';
import type { HomeData } from './homeTypes';

const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold';

/** Item, category, status, next step and amount; the whole row opens the deal. */
function DealsTable({ rows }: { rows: TransactionRow[] }) {
  return <table className="w-full text-left text-sm">
    <thead><tr className="text-xs font-semibold uppercase tracking-wide text-muted">
      <th scope="col" className="pb-2 pr-3 font-semibold">Item</th><th scope="col" className="pb-2 pr-3 font-semibold">Category</th><th scope="col" className="pb-2 pr-3 font-semibold">Status</th>
      <th scope="col" className="pb-2 pr-3 font-semibold">Next step</th><th scope="col" className="pb-2 text-right font-semibold">Amount</th>
    </tr></thead>
    <tbody className="divide-y divide-line">{rows.map(row => <tr key={row.id} className="relative hover:bg-surface-2">
      <td className="py-3 pr-3"><span className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-heading"><TransactionIcon name={row.icon}/></span>
        <Link href={row.href} className="font-semibold text-heading after:absolute after:inset-0 after:content-['']">{row.title}</Link></span></td>
      <td className="py-3 pr-3 text-muted">{resolveDealCategory(row.category, row.subcategory).category.label}</td>
      <td className="py-3 pr-3"><StatusPill status={row.status} short/></td>
      <td className="py-3 pr-3 text-heading">{row.nextStep}{row.deadlineLabel && <span className="block text-xs text-muted">{row.deadlineLabel}</span>}</td>
      <td className="py-3 text-right font-semibold tabular-nums text-heading">{row.amount}</td>
    </tr>)}</tbody>
  </table>;
}

/** Desktop Home: greeting + stats, one dark next-step card, then the deals table. Counts and rows come from stored facts. */
export function DesktopHome(props: HomeData) {
  const next = props.actions[0];
  const headline = props.role === 'seller' ? { href: '/deals/new', text: '+ New deal' } : props.role === 'reviewer' ? { href: '/deals?filter=review', text: 'Review queue' } : null;
  return <div className="hidden flex-1 lg:flex lg:flex-col">
    {props.verified < props.total && <p role="alert" className="mb-4 rounded-xl border border-warning-line bg-warning-bg p-4 text-sm text-warning-text">Some record checks failed. <Link href="/audit" className="font-semibold underline">Open Deal history to inspect them.</Link></p>}
    <div className="grid grid-cols-12 gap-6">
      <section aria-label="Overview" className="col-span-8 rounded-[24px] border border-line bg-gradient-to-br from-surface-2 to-surface p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div><p className="text-sm text-muted">Demo workspace · {props.role[0]!.toUpperCase() + props.role.slice(1)} view</p><h1 className="mt-1 text-[28px] font-bold text-heading">Hi, {demoName(props.role)}</h1></div>
          {headline && <Link href={headline.href} className={`${button} shrink-0 bg-accent text-on-accent hover:opacity-90`}>{headline.text}</Link>}
        </div>
        <HomeStatusRow tiles={props.statusTiles}/>
      </section>
      <section aria-label="Your next step" className="col-span-4 flex flex-col rounded-[24px] border border-[var(--accent)] bg-hero p-6 text-hero-text">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-hero-sub">Your next step</h2>
        {next ? <>
          <p className="mt-4 break-words text-xl font-bold">{next.title}</p>
          <p className="mt-1 text-sm text-hero-sub">{next.nextStep}</p>
          {next.deadlineLabel && <p className="mt-1 text-sm text-hero-text">{next.deadlineLabel}</p>}
          <Link href={next.href} className={`${button} mt-auto self-start bg-white text-[#0B1F4B] hover:opacity-90`}>Open deal</Link>
        </> : <>
          <p className="mt-4 text-xl font-bold">You’re all caught up</p>
          <p className="mt-1 text-sm text-hero-sub">No actions waiting.</p>
          {props.role === 'seller' && <Link href="/deals/new" className={`${button} mt-auto self-start bg-white text-[#0B1F4B] hover:opacity-90`}>+ New deal</Link>}
        </>}
      </section>
      <section aria-label="Your deals" className="col-span-12 rounded-[24px] border border-line bg-surface p-6">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg text-heading">{props.recentTitle === 'Review queue' ? 'Review queue' : 'Your deals'}</h2><Link href={props.recentTitle === 'Review queue' ? '/deals?filter=review' : '/deals'} className="inline-flex min-h-11 items-center text-sm font-semibold text-heading hover:underline">See all</Link></div>
        {props.recent.length ? <DealsTable rows={props.recent.slice(0, 5)}/> : <p className="py-6 text-sm text-muted">No deals to show yet.</p>}
        {props.total === 0 && <div className="mt-4"><SeedButton role={props.role}/></div>}
      </section>
    </div>
    <footer className="mt-auto flex items-center justify-between gap-5 border-t border-line pt-4 text-sm text-muted"><p>{props.simulated ? "Demo mode (no real money)" : 'PayPal Sandbox'} · Demo data · No real money moves.</p><span className="flex gap-5"><Link href="/audit" className="inline-flex min-h-11 items-center font-semibold text-heading hover:underline">Deal history{props.total > 0 && props.verified === props.total ? ' ✓' : ''}</Link><Link href="/about#limitations" className="inline-flex min-h-11 items-center font-semibold text-heading hover:underline">Limitations</Link></span></footer>
  </div>;
}
