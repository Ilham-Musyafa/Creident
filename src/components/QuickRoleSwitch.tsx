'use client';

import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from './view';

const roles: { value: Role; label: string; detail: string }[] = [
  { value: 'buyer', label: 'Buyer', detail: 'Buy and inspect items' },
  { value: 'seller', label: 'Seller', detail: 'Create deals and ship items' },
  { value: 'reviewer', label: 'Reviewer', detail: 'Review disputes' },
];
// Restore focus when a role-keyed view replaces the trigger after a client refresh.
// Assigned only by a browser interaction; no server-side user state is stored here.
let requestedFocus: Role | null = null;

/** Demo-role cookie and existing reviewer gates; no real account or authentication. */
export function QuickRoleSwitch({ current, appearance = 'default' }: { current: Role; appearance?: 'default' | 'hero' }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const focusIntent = useRef<'current' | 'first' | 'last'>('current');

  useEffect(() => {
    if (requestedFocus === current && !pending) {
      requestedFocus = null;
      trigger.current?.focus({ preventScroll: true });
    }
  }, [current, pending]);

  useEffect(() => {
    const close = () => menu.current?.hidePopover();
    const desktop = window.matchMedia('(min-width: 1024px)');
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, { passive: true });
    desktop.addEventListener('change', close);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close);
      desktop.removeEventListener('change', close);
    };
  }, []);

  function positionMenu() {
    if (!trigger.current || !menu.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const width = Math.min(292, window.innerWidth - 24);
    const top = rect.bottom + 8;
    Object.assign(menu.current.style, {
      width: `${width}px`, left: `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`,
      top: `${top}px`, maxHeight: `${Math.max(0, window.innerHeight - top - 12)}px`,
    });
  }
  function closeAndFocus() {
    menu.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  }
  function select(next: Role) {
    closeAndFocus();
    if (next === current) return;
    requestedFocus = next;
    document.cookie = `hv-role=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }
  function menuKeys(event: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])];
    const index = items.findIndex(item => item === document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : event.key === 'ArrowDown' ? (index + 1) % items.length
      : event.key === 'ArrowUp' ? (index - 1 + items.length) % items.length : null;
    if (next !== null) { event.preventDefault(); items[next]?.focus({ preventScroll: true }); }
    else if (event.key === 'Escape') { event.preventDefault(); closeAndFocus(); }
    else if (event.key === 'Tab') closeAndFocus();
  }

  return <>
    <button ref={trigger} type="button" popoverTarget={popoverId} aria-label={`Demo role: ${current}. Choose role`}
      aria-haspopup="menu" aria-controls={popoverId} aria-expanded={open} aria-busy={pending} disabled={pending}
      onClick={() => { focusIntent.current = 'current'; positionMenu(); }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); focusIntent.current = event.key === 'ArrowDown' ? 'first' : 'last';
          positionMenu(); menu.current?.showPopover();
        }
      }}
      className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm! font-medium! disabled:opacity-60 ${appearance === 'hero' ? 'border-hero-text/20 bg-hero-text/10 text-hero-text hover:bg-hero-text/20' : 'border-line bg-surface text-heading hover:bg-surface-2'}`}>
      <span className="capitalize">{current}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <div ref={menu} id={popoverId} popover="auto" role="menu" aria-label="Choose demo role" onKeyDown={menuKeys}
      onToggle={event => {
        const showing = event.newState === 'open'; setOpen(showing);
        if (showing) requestAnimationFrame(() => {
          const items = menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
          const index = focusIntent.current === 'first' ? 0 : focusIntent.current === 'last' ? roles.length - 1 : roles.findIndex(role => role.value === current);
          items?.[index]?.focus({ preventScroll: true });
        });
      }}
      style={{ position: 'fixed', inset: 'auto' }} className="m-0 overflow-y-auto rounded-[22px] border border-line bg-surface p-2 text-text shadow-xl">
      <p role="presentation" className="px-3 pb-2 pt-2 text-xs font-medium text-muted">Demo role</p>
      {roles.map(role => <button key={role.value} type="button" role="menuitemradio" aria-checked={current === role.value} tabIndex={-1} disabled={pending}
        onClick={() => select(role.value)} className={`flex min-h-16 w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left hover:bg-surface-2 ${current === role.value ? 'bg-surface-2' : ''}`}>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-heading">{role.label}</span><span className="mt-1 block text-xs text-muted">{role.detail}</span></span>
        {current === role.value && <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0 text-heading"><path d="m5 12 4 4L19 6"/></svg>}
      </button>)}
    </div>
    <span className="sr-only" role="status">{pending ? 'Switching demo role' : `Current demo role: ${current}`}</span>
  </>;
}
