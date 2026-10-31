import Link from 'next/link';

/** Separate from the row link, so both navigation and edit are valid keyboard targets. */
export function DraftRowMenu({ id }: { id: string }) {
  return <details className="border-t border-line px-4 py-1">
    <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl text-sm font-semibold text-heading focus-visible:outline-2 focus-visible:outline-accent"><span>Deal actions</span><span aria-hidden="true">⋯</span></summary>
    <Link href={`/deals/${id}/edit`} className="mb-2 inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-heading hover:bg-surface-2">Edit deal</Link>
  </details>;
}
