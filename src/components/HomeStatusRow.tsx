import Link from 'next/link';
import type { ReactNode } from 'react';
export type HomeStatusTile = { label: string; count: number; href: string; detail: string };

// Tint per tile, reusing the status colour tokens so light and dark both work.
const TILE: Record<string, { tone: string; icon: ReactNode }> = {
  'Waiting for you': { tone: 'bg-[var(--awaiting-bg)] text-[var(--awaiting-text)]', icon: <path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/> },
  'In progress': { tone: 'bg-[var(--inspection-bg)] text-[var(--inspection-text)]', icon: <path d="M4 12h12m-4-5 5 5-5 5"/> },
  Problem: { tone: 'bg-[var(--disputed-bg)] text-[var(--disputed-text)]', icon: <path d="M12 8v5m0 3v.01M10.3 4.5 3 17.5a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0Z"/> },
  Closed: { tone: 'bg-[var(--completed-bg)] text-[var(--completed-text)]', icon: <path d="m5 12 4.5 4.5L19 7"/> },
};

/** Desktop stat tiles: tinted icon top-right, big number, one-line label. Each links to the matching Transactions filter. */
export function HomeStatusRow({ tiles }: { tiles: HomeStatusTile[] }) {
  return <nav aria-label="Order status" className="grid grid-cols-4 gap-3">{tiles.map(tile => {
    const look = TILE[tile.label];
    return <Link key={tile.label} href={tile.href} title={tile.detail} className="hv-press flex min-h-28 min-w-0 flex-col rounded-2xl border border-line bg-surface p-4 text-heading hover:bg-surface-2">
      <span className="flex items-start justify-between gap-2">
        <span className="text-3xl font-bold tabular-nums">{tile.count}</span>
        {look && <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-full ${look.tone}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">{look.icon}</svg></span>}
      </span>
      <span className="mt-auto whitespace-nowrap pt-2 text-sm font-semibold">{tile.label}</span>
    </Link>;
  })}</nav>;
}
