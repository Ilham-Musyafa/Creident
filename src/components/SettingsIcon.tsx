import type { ReactNode } from 'react';

const paths = {
  role: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  appearance: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></>,
  data: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/></>,
  rules: <><path d="M9 3h6l2 3h3v15H4V6h3l2-3ZM9 3v5h6V3M8 12h8M8 16h5"/></>,
  records: <><path d="M5 3h10l4 4v14H5V3ZM14 3v5h5M8 12h8M8 16h6"/></>,
  fairness: <><path d="M4 20h16M7 16v-5M12 16V5M17 16V8"/></>,
  limits: <><path d="m12 3 10 18H2L12 3ZM12 9v5M12 17v.5"/></>,
  about: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.5"/></>,
  oversight: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
} satisfies Record<string, ReactNode>;
export type SettingsIconName = keyof typeof paths;
export function SettingsIcon({ name, className = 'size-5' }: { name: SettingsIconName; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}
