import Link from 'next/link';
import type { ReactNode } from 'react';
import { BottomNav } from './ui';

type Active = 'Home' | 'Deals' | 'New' | 'Audit' | 'Menu';

/** Bottom navigation on mobile, sidebar from 1024px, content max width 1100px. */
export function AppShell({ active, children }: { active?: Active; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg lg:flex">
      <div className="fixed inset-x-0 bottom-0 z-20 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:border-r lg:border-line lg:bg-surface">
        <div className="hidden px-6 pt-6 lg:block">
          <Link href="/" className="flex min-h-11 items-center gap-3">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-hero"><span className="size-3.5 rotate-45 rounded-[4px] bg-accent"/></span>
            <span className="text-lg font-extrabold tracking-tight text-heading">HalcyVault</span>
          </Link>
        </div>
        <BottomNav active={active}/>
      </div>
      <main className="hv-page mx-auto min-w-0 w-full max-w-[1100px] px-5 pb-32 pt-6 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
    </div>
  );
}

export function PageHeader({ title, back, subtitle, right }: { title: string; back?: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {back && <Link href={back} className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-heading" aria-label="Back">← Back</Link>}
        <h1 className="text-xl font-extrabold tracking-tight text-heading">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[22px] border border-line bg-surface p-4 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <div className="mb-3 mt-6 flex items-center justify-between"><h2 className="text-[15px] font-bold text-heading">{children}</h2>{right}</div>;
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning'; children: ReactNode }) {
  const style = tone === 'warning'
    ? { background: 'var(--warning-bg)', borderColor: 'var(--warning-line)', color: 'var(--warning-text)' }
    : { background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--muted)' };
  return <p className="rounded-[16px] border p-3 text-xs leading-relaxed" style={style}>{children}</p>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="rounded-[22px] border border-dashed border-line bg-surface p-6 text-center"><p className="text-sm font-bold text-heading">{title}</p>{children && <div className="mt-3 text-sm text-muted">{children}</div>}</div>;
}
