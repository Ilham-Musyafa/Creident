'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BrandLogo } from './BrandLogo';

/** Native modal supplies focus containment, Escape handling and background isolation. */
export function DesktopNavigation({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const resize = () => { if (!desktop.matches) dialog.current?.close(); };
    desktop.addEventListener('change', resize);
    return () => desktop.removeEventListener('change', resize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const close = () => dialog.current?.close();
  return <div className="hidden print:hidden lg:block">
    <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-2">
      <button type="button" aria-haspopup="dialog" aria-controls="desktop-navigation" aria-expanded={open}
        onClick={() => { dialog.current?.showModal(); setOpen(true); }}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-heading hover:bg-surface-2">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-5"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        Menu
      </button>
      <Link href="/" aria-label="Creident home"><BrandLogo/></Link>
    </header>
    <dialog id="desktop-navigation" ref={dialog} aria-label="Navigation menu" onClose={() => setOpen(false)}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }}
      onClick={event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) close();
      }}
      className="desktop-navigation m-0 h-dvh max-h-none w-80 max-w-full overflow-y-auto border-r border-line bg-surface p-0 text-text backdrop:bg-hero/30">
      <div className="flex items-center justify-between px-2 pt-3">
        <Link href="/" aria-label="Creident home" onClick={close}><BrandLogo/></Link>
        <button type="button" autoFocus aria-label="Close navigation menu" onClick={close}
          className="grid size-11 shrink-0 place-items-center rounded-full text-heading hover:bg-surface-2">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5"><path d="m6 6 12 12M6 18 18 6"/></svg>
        </button>
      </div>
      <div onClick={event => { if ((event.target as HTMLElement).closest('a')) close(); }}>{children}</div>
    </dialog>
  </div>;
}
