'use client';

import { useId, useRef, useState } from 'react';

/** Native popover keeps the explanation tappable and dismissible without a library. */
export function PayPalHoldInfo() {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  function position() {
    if (!trigger.current || !popover.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 32);
    popover.current.style.width = `${width}px`;
    const height = popover.current.getBoundingClientRect().height || 180;
    Object.assign(popover.current.style, {
      left: `${Math.max(16, Math.min(rect.left, window.innerWidth - width - 16))}px`,
      top: `${Math.max(16, Math.min(rect.bottom + 8, window.innerHeight - height - 16))}px`,
    });
  }
  return <>
    <button ref={trigger} type="button" popoverTarget={id} aria-label="About this PayPal hold" aria-expanded={open} aria-describedby={id}
      onClick={position} className="grid size-11 shrink-0 place-items-center rounded-full text-heading hover:bg-surface-2">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg>
    </button>
    <div ref={popover} id={id} popover="auto" role="tooltip" onToggle={event => { setOpen(event.newState === 'open'); if (event.newState === 'open') position(); }}
      style={{ position: 'fixed', inset: 'auto' }} className="m-0 max-h-[calc(100dvh_-_32px)] overflow-auto rounded-[24px] border border-line bg-surface p-4 text-sm leading-relaxed text-text shadow-xl">
      Payment actions in Creident are on hold while a PayPal dispute is open. A person decides, guided by the rules. AI only summarises evidence.
    </div>
  </>;
}
