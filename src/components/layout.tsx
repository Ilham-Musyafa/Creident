import Link from 'next/link';
import type { ReactNode } from 'react';
import { BottomNav } from './ui';
import { DesktopNavigation } from './DesktopNavigation';

type Active = 'Home' | 'Deals' | 'Audit' | 'Menu';

/** Bottom navigation on mobile, slide-out menu from 1024px, content max width 1100px. */
export function AppShell({ active, children, mobileFullBleed = false }: { active?: Active; children: ReactNode; mobileFullBleed?: boolean }) {
  return (
    <div className="min-h-screen bg-bg">
      <DesktopNavigation><BottomNav active={active}/></DesktopNavigation>
      <div className="fixed inset-x-0 bottom-0 z-20 print:hidden lg:hidden">
        <BottomNav active={active}/>
      </div>
      <main className={`hv-page mx-auto min-w-0 w-full max-w-[1100px] pb-32 lg:px-10 lg:pb-12 lg:pt-10 ${(mobileFullBleed || active === 'Home' || active === 'Menu') ? 'px-0 pt-0' : 'px-5 pt-6'}`}>{children}</main>
    </div>
  );
}

export function PageHeader({ title, back, subtitle, right }: { title: string; back?: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {/* Round icon-only back button (owner choice); the accessible name stays "Back". */}
        {back && <Link href={back} aria-label="Back" title="Back"
          className="hv-press grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-heading hover:bg-surface-2">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="m15 18-6-6 6-6"/></svg>
        </Link>}
        <div className="min-w-0">
          <h1 className={`text-[28px] leading-tight text-heading sm:text-[32px] ${back ? 'flex min-h-11 items-center' : ''}`}>{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
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
  // A div, not a p: some notices hold block content (details, paragraphs).
  return <div className="rounded-[16px] border p-3 text-sm leading-relaxed" style={style}>{children}</div>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="rounded-[22px] border border-dashed border-line bg-surface p-6 text-center"><p className="text-sm font-bold text-heading">{title}</p>{children && <div className="mt-3 text-sm text-muted">{children}</div>}</div>;
}
