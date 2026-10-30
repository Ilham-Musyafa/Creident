import Link from 'next/link';
export type HomeStatusTile = { label: string; count: number; href: string; detail: string };
export function HomeStatusRow({ tiles }: { tiles: HomeStatusTile[] }) {
  return <nav aria-label="Order status" className="grid grid-cols-4 gap-2">{tiles.map(tile => <Link key={tile.label} href={tile.href} title={tile.detail} className="flex min-h-24 min-w-0 flex-col rounded-[20px] border border-line bg-surface p-2 sm:p-3 text-heading hover:bg-surface-2">
    <span className="text-2xl font-bold tabular-nums">{tile.count}</span><span className="mt-1 break-words text-xs font-semibold sm:text-sm">{tile.label}</span><span className="sr-only sm:not-sr-only sm:mt-1 sm:text-xs sm:text-muted">{tile.detail}</span>
  </Link>)}</nav>;
}
