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

// Eight short lines around the badge that retract at the end (centre x, centre y, dx, dy, which end the trim shrinks toward).
const SPARKS = [[115.7, 468.7, 20.86, -20.86, 'end'], [467.8, 115.8, 20.86, -20.86, 'start'], [115.3, 116.2, 20.86, 20.86, 'end'], [468.2, 468.3, 20.86, 20.86, 'start'],
  [77.5, 298.5, 29.5, 0, 'end'], [576, 298, 29.5, 0, 'start'], [298, 577, 0, 29.5, 'end'], [297.5, 78.5, 0, 29.5, 'start']] as const;

/** Ring that draws itself, a scalloped blue badge that pops in, a white check that draws, then corner sparks. Pure SVG + CSS, no library. */
function VerifiedMark() {
  return (
    <svg viewBox="20 20 560 560" className="hv-mark w-48 sm:w-56" style={{ filter: 'drop-shadow(0 8px 14px rgba(0,0,0,.16))' }}>
      <circle className="hv-tick-ring" cx="301.9" cy="289.9" r="183.9" fill="none" stroke="#e4e4e4" strokeWidth="20" pathLength="1" transform="rotate(-90 301.9 289.9)"/>
      <g className="hv-tick-sparks">
        {SPARKS.map(([x, y, dx, dy, toward], i) => (
          <line key={i} className={toward === 'end' ? 'hv-tick-spark-a' : 'hv-tick-spark-b'} x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy}
            pathLength="1" stroke="#0043c9" strokeWidth="12"/>
        ))}
      </g>
      <g transform="translate(300 300)">
        <g className="hv-tick-badge"><path fill="#0043c9" d="M49.7 -183.9C49.7 -183.9 75.9 -160.9 75.9 -160.9C78 -159.1 80.5 -157.8 83.1 -157.2C83.1 -157.2 117.3 -149.7 117.3 -149.7C122.5 -148.5 126.9 -144.8 128.8 -139.8C128.8 -139.8 141.3 -107.2 141.3 -107.2C142.3 -104.7 143.9 -102.5 146 -100.7C146 -100.7 172.7 -78.3 172.7 -78.3C176.9 -74.8 179 -69.5 178.4 -64.1C178.4 -64.1 174.3 -29.6 174.3 -29.6C173.9 -26.9 174.3 -24.1 175.4 -21.6C175.4 -21.6 188.6 10.6 188.6 10.6C190.6 15.6 190 21.3 187 25.7C187 25.7 167.2 54.4 167.2 54.4C165.7 56.6 164.7 59.2 164.5 61.9C164.5 61.9 161.2 96.5 161.2 96.5C160.6 101.9 157.4 106.7 152.7 109.2C152.7 109.2 121.8 125.4 121.8 125.4C119.4 126.7 117.3 128.5 115.8 130.8C115.8 130.8 96.7 159.9 96.7 159.9C93.8 164.4 88.7 167.1 83.3 167.1C83.3 167.1 48.4 167.2 48.4 167.2C45.7 167.2 43 167.9 40.6 169.2C40.6 169.2 10.1 186.1 10.1 186.1C5.4 188.7 -0.4 188.8 -5.2 186.3C-5.2 186.3 -36.2 170.1 -36.2 170.1C-38.6 168.9 -41.3 168.3 -44 168.3C-44 168.3 -78.9 169.1 -78.9 169.1C-84.3 169.3 -89.5 166.7 -92.6 162.2C-92.6 162.2 -112.5 133.6 -112.5 133.6C-114 131.4 -116.1 129.6 -118.6 128.4C-118.6 128.4 -149.9 113 -149.9 113C-154.8 110.6 -158.1 105.9 -158.8 100.6C-158.8 100.6 -163.1 66 -163.1 66C-163.5 63.3 -164.5 60.8 -166.1 58.6C-166.1 58.6 -186.7 30.4 -186.7 30.4C-189.9 26.1 -190.6 20.4 -188.7 15.3C-188.7 15.3 -176.4 -17.2 -176.4 -17.2C-175.5 -19.7 -175.2 -22.5 -175.6 -25.2C-175.6 -25.2 -180.7 -59.6 -180.7 -59.6C-181.5 -64.9 -179.5 -70.3 -175.5 -73.9C-175.5 -73.9 -149.4 -97 -149.4 -97C-147.4 -98.8 -145.8 -101.1 -144.9 -103.7C-144.9 -103.7 -133.4 -136.5 -133.4 -136.5C-131.6 -141.6 -127.4 -145.4 -122.1 -146.7C-122.1 -146.7 -88.2 -155.1 -88.2 -155.1C-85.6 -155.7 -83.2 -157 -81.2 -158.9C-81.2 -158.9 -55.6 -182.6 -55.6 -182.6C-51.7 -186.2 -46.1 -187.7 -40.8 -186.4C-40.8 -186.4 -6.9 -178.1 -6.9 -178.1C-4.2 -177.5 -1.5 -177.5 1.2 -178.2C1.2 -178.2 34.8 -187.3 34.8 -187.3C40.1 -188.8 45.7 -187.5 49.7 -183.9Z"/></g>
        <path className="hv-tick-check" d="M-84.9 .7 L-28.7 56.8 L84.9 -56.8" fill="none" stroke="#fff" strokeWidth="21" strokeLinejoin="miter" pathLength="1"/>
      </g>
    </svg>
  );
}

/**
 * A one-time celebration for a success that just happened (payment approved, deal completed,
 * decision recorded). Shown at most once per browser for the given key; a decoration only,
 * the page text already states the outcome.
 */
export function SuccessBurst({ storageKey, label, confetti = true, inline = false }: { storageKey: string; label: string; confetti?: boolean; inline?: boolean }) {
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
  // Deal pages reserve a small inline notice instead of covering their action cards.
  if (inline) return <p aria-hidden="true" data-success-notice className="mb-4 flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-heading">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hv-step-done size-5 shrink-0 text-[var(--inspection-text)]"><path d="m5 12 4 4L19 6"/></svg>{label}
  </p>;
  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
      <div className="relative grid place-items-center">
        {confetti && CONFETTI.map((c, i) => (
          <span key={i} className="absolute size-2 rounded-[2px]"
            style={{ left: 'calc(50% - 4px)', top: 'calc(50% - 4px)', background: `var(${c.tone})`, ['--dx' as string]: `${c.dx}px`, ['--dy' as string]: `${c.dy}px`, ['--rot' as string]: `${c.rot}deg`,
              animation: `hv-confetti .9s cubic-bezier(.2,.7,.3,1) ${900 + (i % 4) * 30}ms both` }}/>
        ))}
        <VerifiedMark/>
        <p className="hv-tick-label -mt-4 rounded-full bg-surface px-3 py-1 text-sm font-bold text-heading shadow">{label}</p>
      </div>
    </div>,
    document.body,
  );
}
