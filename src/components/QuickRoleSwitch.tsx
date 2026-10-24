'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from './view';

/** Same demo-role cookie as Menu; refresh Home without navigating away. */
export function QuickRoleSwitch({ current, appearance = 'default' }: { current: Role; appearance?: 'default' | 'hero' }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = current === 'buyer' ? 'seller' : 'buyer';
  return <button type="button" aria-label={`Demo ${current}. Switch to ${next}`} title={`Switch to ${next}`}
    aria-busy={pending} disabled={pending}
    className={`flex min-h-11 min-w-11 shrink-0 flex-col items-center gap-1 rounded-xl p-1 disabled:opacity-60 ${appearance === 'hero' ? 'text-hero-text hover:bg-hero-text/10' : 'text-heading hover:bg-surface-2'}`}
    onClick={() => {
      document.cookie = `hv-role=${next}; path=/; max-age=31536000; samesite=lax`;
      startTransition(() => router.refresh());
    }}>
    <span aria-hidden="true" className={`grid size-11 place-items-center rounded-full font-extrabold ${appearance === 'hero' ? 'border border-hero-text/20 bg-hero-text/10' : 'bg-surface-2'}`}>{current[0]!.toUpperCase()}</span>
    <span className="flex items-center gap-1 text-xs font-semibold capitalize">{current}
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4"/></svg>
    </span>
    <span className="sr-only" role="status">{pending ? `Switching to ${next}` : `Current demo role: ${current}`}</span>
  </button>;
}
