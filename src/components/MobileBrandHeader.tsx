import Link from 'next/link';
import { QuickRoleSwitch } from './QuickRoleSwitch';
import type { Role } from './view';

/** Shared mobile signature and role control across the reference-inspired pages. */
export function MobileBrandHeader({ role }: { role: Role }) {
  return <header className="mobile-brand-banner relative isolate overflow-hidden px-5 pb-14 pt-7 text-hero-text">
    <div className="relative z-10 flex items-center justify-between gap-3">
      <Link href="/" aria-label="Creident Home" className="flex min-h-11 items-center gap-2.5 rounded-lg">
        <img src="/brand/symbol-dark.png" width="36" height="36" alt=""/>
        <span className="brand-wordmark text-[28px] leading-none">Creident</span>
      </Link>
      <QuickRoleSwitch current={role} appearance="hero"/>
    </div>
    <p className="relative z-10 mt-4 text-sm text-hero-sub">Every deal, on record.</p>
  </header>;
}
