'use client';
// Small motion pieces (docs/UI.md "Motion"). Each respects prefers-reduced-motion.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function reducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; }
}

/** Counts a money string such as "$466.00" up from zero; renders the final value without JS. */
export function CountUp({ value, durationMs = 900 }: { value: string; durationMs?: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const match = value.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
    if (!match || reducedMotion()) { setShown(value); return; }
    const [, prefix, digits, suffix] = match;
    const target = Number(digits!.replace(/,/g, ''));
    const decimals = digits!.includes('.') ? digits!.split('.')[1]!.length : 0;
    const format = (n: number) => `${prefix}${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    let frame = 0; const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setShown(format(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);
  return <span aria-label={value}>{shown}</span>;
}

const CONFETTI = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const distance = 46 + (i % 3) * 14;
  return { dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance - 10, rot: (i * 47) % 360, tone: ['--accent', '--inspection-text', '--success-text', '--awaiting-text'][i % 4] };
});

/**
 * A one-time celebration for a success that just happened (payment approved, deal completed,
 * decision recorded). Shown at most once per browser for the given key; a decoration only,
 * the page text already states the outcome.
 */
export function SuccessBurst({ storageKey, label, confetti = true }: { storageKey: string; label: string; confetti?: boolean }) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (reducedMotion()) return;
    // Store when the burst started, so a remount during a page refresh continues it
    // instead of starting again or vanishing.
    const key = `hv-burst:${storageKey}`; const now = Date.now();
    let started = now;
    try {
      const stored = Number(window.sessionStorage.getItem(key));
      if (stored) started = stored; else window.sessionStorage.setItem(key, String(now));
    } catch { /* storage unavailable: show once for this mount */ }
    const remaining = 2200 - (now - started);
    if (remaining <= 0) return;
    setShow(true);
    timer.current = setTimeout(() => setShow(false), remaining);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [storageKey]);
  if (!show) return null;
  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
      <div className="relative grid place-items-center">
        {confetti && CONFETTI.map((c, i) => (
          <span key={i} className="absolute size-2 rounded-[2px]"
            style={{ left: 'calc(50% - 4px)', top: 36, background: `var(${c.tone})`, ['--dx' as string]: `${c.dx}px`, ['--dy' as string]: `${c.dy}px`, ['--rot' as string]: `${c.rot}deg`,
              animation: `hv-confetti .9s cubic-bezier(.2,.7,.3,1) ${120 + (i % 4) * 30}ms both` }}/>
        ))}
        <div className="hv-verified grid size-20 place-items-center rounded-full bg-accent shadow-lg">
          <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5 10 17.5 19 7" style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: 'hv-draw .4s ease-out .25s forwards' }}/>
          </svg>
        </div>
        <p className="hv-page mt-3 rounded-full bg-surface px-3 py-1 text-sm font-bold text-heading shadow">{label}</p>
      </div>
    </div>,
    document.body,
  );
}
