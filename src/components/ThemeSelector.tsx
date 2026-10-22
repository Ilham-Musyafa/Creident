'use client';
// Appearance picker: icon tiles (sun, moon, auto) with a label under each, like phone settings.
import { useEffect, useState, type ReactNode } from 'react';

const options = ['Light', 'Dark', 'System'] as const;
type Choice = typeof options[number];

const icons: Record<Choice, ReactNode> = {
  Light: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  Dark: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>,
  // Half-filled circle: follows the phone or computer setting.
  System: <><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></>,
};

export function ThemeSelector() {
  const [choice, setChoice] = useState<Choice>('System');
  useEffect(() => { const theme = document.documentElement.dataset.theme; setChoice(theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'); }, []);
  function change(next: Choice) {
    setChoice(next);
    document.documentElement.dataset.theme = next.toLowerCase();
    try { localStorage.setItem('creident-theme', next.toLowerCase()); } catch { /* Private browsing can block storage. */ }
  }
  return <div role="group" aria-label="Appearance" className="grid max-w-xs grid-cols-3 gap-2">
    {options.map((option) => {
      const active = option === choice;
      return <button key={option} type="button" aria-pressed={active} onClick={() => change(option)}
        className={`hv-press flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-[16px] border text-xs font-semibold transition-colors ${active ? 'border-heading bg-surface-2 text-heading' : 'border-line text-muted hover:text-heading'}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[option]}</svg>
        {option}
      </button>;
    })}
  </div>;
}
