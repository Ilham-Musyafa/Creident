'use client';
import { BrandWordmark } from './BrandLogo';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { QuickRoleSwitch } from './QuickRoleSwitch';
import { ThemeSelector } from './ThemeSelector';
import { NavIcon } from './ui';
import { SettingsIcon } from './SettingsIcon';
import type { Role } from './view';

type Active = 'Home' | 'Deals' | 'Audit' | 'Menu';
const mainLinks: { key: Active; title: string; href: string }[] = [
  { key: 'Home', title: 'Home', href: '/' }, { key: 'Deals', title: 'Transactions', href: '/deals' },
  { key: 'Audit', title: 'Records', href: '/audit' }, { key: 'Menu', title: 'Settings', href: '/menu' },
];
const learnLinks = [
  { title: 'How it works', href: '/about#decisions', icon: 'rules' },
  { title: 'Fairness', href: '/fairness', icon: 'fairness' },
  { title: 'Limitations', href: '/about#limitations', icon: 'limits' },
  { title: 'About', href: '/about', icon: 'about' },
] as const;

function pageInfo(path: string): { title: string; subtitle: string; selected: Active | null } {
  if (path === '/') return { title: 'Home', subtitle: 'Your demo workspace and next steps.', selected: 'Home' };
  if (path === '/deals') return { title: 'Transactions', subtitle: 'Find a deal and see what happens next.', selected: 'Deals' };
  if (path === '/deals/new') return { title: 'New deal', subtitle: 'Agree on the terms before payment.', selected: 'Deals' };
  if (path.startsWith('/deals/')) {
    const tail = path.split('/')[3] ?? '';
    const pages: Record<string, [string, string]> = {
      checkout: ['Payment approval', 'Check the agreed terms before approving.'],
      evidence: ['Evidence', 'Add information for a human dispute review.'],
      review: ['Dispute review', 'Recorded evidence and a human decision.'],
      decision: ['Decision record', 'Read the outcome and its recorded reasons.'],
    };
    const [title, subtitle] = pages[tail] ?? ['Deal', 'Terms, progress and the next step.'];
    return { title, subtitle, selected: 'Deals' };
  }
  if (path === '/audit') return { title: 'Records', subtitle: 'Check the recorded steps for each deal.', selected: 'Audit' };
  if (path === '/audit/how-it-works') return { title: 'How verification works', subtitle: 'What record checks cover and their limits.', selected: 'Audit' };
  if (path.startsWith('/audit/')) return { title: 'Deal record', subtitle: 'Inspect the steps and their verification.', selected: 'Audit' };
  if (path === '/menu') return { title: 'Settings', subtitle: 'Demo role, appearance and useful links.', selected: 'Menu' };
  if (path === '/fairness') return { title: 'Fairness results', subtitle: 'Recorded evaluation results and their limits.', selected: null };
  if (path === '/about') return { title: 'About Creident', subtitle: 'Clear terms, evidence and human review.', selected: null };
  if (path === '/reviewer/oversight') return { title: 'Reviewer oversight', subtitle: 'Inspect the existing demo review workspace.', selected: 'Menu' };
  if (path.startsWith('/paypal/')) return { title: path.endsWith('/return') ? 'Back from PayPal' : 'Demo payment approval', subtitle: 'Test payments only. No real money moves.', selected: 'Deals' };
  return { title: 'Creident', subtitle: 'Every deal, on record.', selected: null };
}

function AppearanceMenu() {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  return <>
    <button ref={trigger} type="button" popoverTarget={id} aria-label="Appearance" aria-haspopup="dialog" aria-expanded={open} className="grid size-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-heading hover:bg-surface-2">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>
    </button>
    <div id={id} ref={panel} popover="auto" role="dialog" aria-label="Choose appearance" onToggle={event => setOpen(event.newState === 'open')}
      onClick={event => { if ((event.target as HTMLElement).closest('button')) { panel.current?.hidePopover(); trigger.current?.focus(); } }} className="desktop-theme-panel m-0 rounded-[22px] border border-line bg-surface p-4 text-text shadow-xl">
      <p className="mb-3 text-sm font-semibold text-heading">Appearance</p><ThemeSelector/>
    </div>
  </>;
}

/** Persistent shell presentation. Current demo role comes from the same server cookie as pages. */
export function DesktopNavigation({ role, simulated, active }: { role: Role; simulated: boolean; active?: Active }) {
  const pathname = usePathname();
  const [hash, setHash] = useState('');
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync(); window.addEventListener('hashchange', sync); window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, [pathname]);
  const info = pageInfo(pathname);
  const selected = info.selected ?? (pathname === '/about' || pathname === '/fairness' ? null : active);
  const learnCurrent = pathname === '/fairness' ? '/fairness' : pathname === '/about' ? hash === '#decisions' ? '/about#decisions' : hash === '#limitations' ? '/about#limitations' : '/about' : null;
  return <div className="desktop-shell hidden print:hidden lg:block">
    <a href="#main-content" className="desktop-skip rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-on-accent">Skip to content</a>
    <aside className="desktop-sidebar fixed inset-y-0 left-0 z-30 flex flex-col overflow-y-auto border-r p-5" aria-label="Desktop sidebar">
      <Link href="/" aria-label="Creident home" className="rounded-xl px-1 py-3">
        <span className="flex items-center gap-3"><BrandWordmark inverse className="h-[28px]"/><span className="desktop-demo-badge rounded-full border px-2 py-1 text-xs font-medium">Demo</span></span>
        <span className="mt-3 block text-sm text-[var(--desktop-sidebar-muted)]">Every deal, on record.</span>
      </Link>
      <nav aria-label="Main navigation" className="mt-6 space-y-2">{mainLinks.map(link => <Link key={link.key} href={link.href} aria-current={selected === link.key ? 'page' : undefined} className="desktop-sidebar-link flex min-h-12 items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold"><NavIcon name={link.key}/><span>{link.title}</span></Link>)}</nav>
      <nav aria-label="Learn" className="mb-6 mt-8 space-y-1"><h2 className="mb-3 px-4 text-xs font-semibold uppercase tracking-widest text-[var(--desktop-sidebar-muted)]">Learn</h2>{learnLinks.map(link => <Link key={link.href} href={link.href} onClick={() => setHash(new URL(link.href, window.location.origin).hash)} aria-current={learnCurrent === link.href ? 'page' : undefined} className="desktop-sidebar-link flex min-h-11 items-center gap-3 rounded-full px-4 py-2 text-sm"><SettingsIcon name={link.icon}/><span>{link.title}</span></Link>)}</nav>
      <div className="mt-auto pt-5"><QuickRoleSwitch current={role} appearance="sidebar"/><p className="mt-3 text-center text-xs leading-relaxed text-[var(--desktop-sidebar-muted)]">{simulated ? 'Simulated payments' : 'PayPal Sandbox'}<br/>Demo data · No real money moves.</p></div>
    </aside>
    <header className="desktop-topbar border-b border-line bg-bg">
      <div className="desktop-topbar-inner mx-auto flex min-w-0 items-center justify-between gap-5">
        <div className="min-w-0 flex-1"><h2 className="text-2xl leading-tight text-heading">{info.title}</h2><p className="mt-1 text-sm text-muted">{info.subtitle} <span className="capitalize">{role}</span> view.</p></div>
        <div className="flex shrink-0 items-center gap-3">{pathname === '/deals' && <div id="desktop-transaction-search" className="desktop-transaction-search"/>}<AppearanceMenu/></div>
      </div>
    </header>
  </div>;
}
