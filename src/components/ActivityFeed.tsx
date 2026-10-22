import Link from 'next/link';
import type { CSSProperties } from 'react';
import { type ActivityItem, type ActivityKind, relativeTime } from './view';

const ICON: Record<ActivityKind, { path: string; tone: string }> = {
  money: { path: 'M12 3v18M16.5 7.5c0-1.9-2-3-4.5-3s-4.5 1.1-4.5 3 2 2.6 4.5 3 4.5 1.1 4.5 3-2 3-4.5 3-4.5-1.1-4.5-3', tone: 'authorized' },
  ship: { path: 'M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7M12 11v10', tone: 'inspection' },
  dispute: { path: 'M12 8v5m0 3.5v.5M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', tone: 'disputed' },
  done: { path: 'm5 12.5 4.5 4.5L19 7.5', tone: 'completed' },
  info: { path: 'M12 11v6m0-10v.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', tone: 'void' },
};

/** Recent deal activity in plain words, like a payments app feed; details live in the audit log. */
export function ActivityFeed({ txId, items, now }: { txId: string; items: ActivityItem[]; now: string }) {
  if (!items.length) return null;
  return <section aria-label="Activity" className="rounded-[22px] border border-line bg-surface p-4">
    <div className="mb-2 flex items-center justify-between gap-3"><h2 className="text-sm font-bold text-heading">Activity</h2>
      <Link href={`/audit/${txId}`} className="inline-flex min-h-11 items-center text-xs font-semibold text-heading hover:underline">Full deal record</Link></div>
    <ol className="hv-stagger">
      {items.map((item) => {
        const icon = ICON[item.kind];
        return <li key={item.seq} className="flex items-center gap-3 py-2">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: `var(--${icon.tone}-bg)`, color: `var(--${icon.tone}-text)` } as CSSProperties}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d={icon.path}/></svg>
          </span>
          <p className="min-w-0 flex-1 text-sm text-text">{item.text}</p>
          <time dateTime={item.ts} className="shrink-0 text-xs text-muted">{relativeTime(item.ts, now)}</time>
        </li>;
      })}
    </ol>
  </section>;
}
