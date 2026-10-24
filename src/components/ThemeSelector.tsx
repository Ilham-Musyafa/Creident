'use client';
// Appearance picker: optional visual previews reuse the same theme state and persistence.
import { useEffect, useState, type ReactNode } from 'react';

const options = ['Light', 'Dark', 'System'] as const;
type Choice = typeof options[number];

const icons: Record<Choice, ReactNode> = {
  Light: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  Dark: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>,
  // Half-filled circle: follows the phone or computer setting.
  System: <><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></>,
};

function ThemePreview({ option }: { option: Choice }) {
  const modes = option === 'System' ? ['light', 'dark'] as const : [option === 'Light' ? 'light' : 'dark'] as const;
  return <span aria-hidden="true" className="flex h-20 w-full overflow-hidden rounded-lg border border-line sm:h-24">
    {modes.map(mode => <span key={mode} className="flex min-w-0 flex-1 flex-col" style={{ backgroundColor: `var(--preview-${mode}-bg)` }}>
      <span className="flex h-4 shrink-0 items-center gap-1 border-b px-2" style={{ backgroundColor: `var(--preview-${mode}-surface)`, borderColor: `var(--preview-${mode}-line)` }}><span className="size-1 rounded-full bg-accent"/><span className="size-1 rounded-full" style={{ backgroundColor: 'var(--brand-sky)' }}/></span>
      <span className="flex min-h-0 flex-1 gap-2 p-2">
        <span className="w-3 shrink-0 rounded-sm" style={{ backgroundColor: `var(--preview-${mode}-line)` }}/>
        <span className="min-w-0 flex-1 space-y-1.5"><span className="block h-1 w-3/4 rounded bg-accent"/><span className="block h-1 w-full rounded" style={{ backgroundColor: `var(--preview-${mode}-line)` }}/><span className="block h-5 rounded border" style={{ backgroundColor: `var(--preview-${mode}-surface)`, borderColor: `var(--preview-${mode}-line)` }}/></span>
      </span>
    </span>)}
  </span>;
}

export function ThemeSelector({ preview = false }: { preview?: boolean }) {
  const [choice, setChoice] = useState<Choice>('System');
  useEffect(() => {
    const sync = () => { const theme = document.documentElement.dataset.theme; setChoice(theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'); };
    sync();
    // Mobile and desktop pickers share the same document theme, including after resize.
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  function change(next: Choice) {
    setChoice(next);
    document.documentElement.dataset.theme = next.toLowerCase();
    try { localStorage.setItem('creident-theme', next.toLowerCase()); } catch { /* Private browsing can block storage. */ }
  }
  return <div role="group" aria-label="Appearance" className={`grid grid-cols-3 gap-2 ${preview ? 'w-full sm:gap-3' : 'max-w-xs'}`}>
    {options.map((option) => {
      const active = option === choice;
      return <button key={option} type="button" aria-pressed={active} onClick={() => change(option)}
        className={`hv-press relative flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-2 rounded-[16px] border text-sm font-semibold transition-colors ${preview ? 'p-2 sm:p-3' : ''} ${active ? 'border-heading bg-surface-2 text-heading' : 'border-line text-muted hover:text-heading'}`}>
        {preview ? <ThemePreview option={option}/> : <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[option]}</svg>}
        <span>{option}</span>
        {preview && active && <span aria-hidden="true" className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-strong text-on-strong"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3"><path d="m5 12 4 4L19 6"/></svg></span>}
      </button>;
    })}
  </div>;
}
