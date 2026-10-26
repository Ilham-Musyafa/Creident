import Link from 'next/link';
import type { ReactNode } from 'react';
import { QuickRoleSwitch } from './QuickRoleSwitch';
import type { Role } from './view';

/** Compact inner-page signature, or an expanded Home header with a real-data hero. */
export function MobileBrandHeader({ role, children, compact = true }: { role: Role; children?: ReactNode; compact?: boolean }) {
  return <header className={`mobile-brand-banner relative isolate overflow-hidden px-5 text-hero-text ${compact ? 'pb-14 pt-5' : 'pb-9 pt-4'}`}>
    <div className="relative z-10 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/" aria-label="Creident Home" className="flex min-h-11 items-center gap-2 rounded-lg">
          <img src="/brand/symbol-dark.png" width="32" height="32" alt=""/>
          <span className="brand-wordmark text-[26px] leading-none">Creident</span>
        </Link>
        <span className="mobile-demo-badge rounded-full border px-2 py-1 text-xs font-medium">Demo</span>
      </div>
      <QuickRoleSwitch current={role} appearance="hero"/>
    </div>
    {children ? <div className="relative z-10">{children}</div> : <p className="relative z-10 mt-3 text-sm text-[var(--mobile-header-muted)]">Every deal, on record.</p>}
  </header>;
}
