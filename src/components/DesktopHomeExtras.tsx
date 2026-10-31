import Link from 'next/link';
import { SettingsIcon } from './SettingsIcon';
import { relativeTime } from './view';
import type { HomeActivityItem } from './homeActivity';

export interface DesktopHomeExtrasProps {
  activity: HomeActivityItem[];
  now: string;
  showDemo: boolean;
  recordedAi: boolean;
}

/** Read-only desktop additions; no animation or new routes. */
export function DesktopHomeExtras({ activity, now, showDemo, recordedAi }: DesktopHomeExtrasProps) {
  return <div className={`desktop-home-extras col-span-12 mt-2 grid gap-6 ${showDemo ? 'min-[1440px]:grid-cols-2' : ''}`}>
    <section aria-labelledby="home-activity-title" className="min-w-0 rounded-[24px] border border-line bg-surface p-7">
      <h2 id="home-activity-title" className="mb-4 flex items-center gap-3 text-lg text-heading"><SettingsIcon name="records"/>Recent activity</h2>
      {!activity.length ? <p className="text-sm text-muted">No activity yet</p> : <ol className="divide-y divide-line">
        {activity.map(item => <li key={`${item.dealId}-${item.seq}`}>
          <Link href={`/deals/${item.dealId}`} className="flex min-h-11 items-center gap-3 rounded-xl py-3 text-sm hover:bg-surface-2">
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-heading"><SettingsIcon name="records"/></span>
            <span className="min-w-0 flex-1"><span className="block text-heading">{item.text}</span><span className="mt-1 block break-words text-muted">{item.item}</span></span>
            <time dateTime={item.ts} className="shrink-0 text-xs text-muted">{relativeTime(item.ts, now)}</time>
          </Link>
        </li>)}
      </ol>}
    </section>
    {showDemo && <section aria-labelledby="home-demo-title" className="min-w-0 rounded-[24px] border border-line bg-surface p-7">
      <h2 id="home-demo-title" className="mb-4 flex items-center gap-3 text-lg text-heading"><SettingsIcon name="data"/>Try the demo</h2>
      <ol className="space-y-3 text-sm">
        {[
          { href: '/menu#demo-role', label: 'Switch role in Settings to Buyer' },
          { href: '/deals', label: 'Open a deal and report a problem' },
          { href: '/menu#demo-role', label: 'Switch to Reviewer to see the evidence summary and decision' },
        ].map((step, index) => <li key={step.label}><Link href={step.href} className="flex min-h-11 items-start gap-3 rounded-xl py-2 text-heading hover:bg-surface-2"><span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 font-semibold">{index + 1}</span><span className="pt-0.5">{step.label}</span></Link></li>)}
      </ol>
      <p className="mt-5 text-sm text-muted">AI summarises evidence, a person decides.</p>
      <p className="mt-2 text-sm text-muted">Demo mode: simulated PayPal, {recordedAi ? 'recorded AI answers' : 'live AI answers'}, no real money.</p>
    </section>}
  </div>;
}
