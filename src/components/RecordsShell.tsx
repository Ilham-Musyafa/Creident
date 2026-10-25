import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppShell, PageHeader } from './layout';
import { MobileBrandHeader } from './MobileBrandHeader';
import type { Role } from './view';

/** Shared mobile composition; desktop retains its existing header and page geometry. */
export function RecordsShell({ role, title, desktopTitle = title, subtitle, back, desktopBack = back, right, children }: {
  role: Role; title: string; desktopTitle?: string; subtitle?: string; back?: string;
  desktopBack?: string; right?: ReactNode; children: ReactNode;
}) {
  return <AppShell active="Audit" mobileFullBleed>
    <div className="lg:hidden"><MobileBrandHeader role={role}/></div>
    <div className="records-panel relative -mt-8 min-h-[70dvh] rounded-t-[32px] bg-surface px-5 pb-5 pt-6 lg:static lg:m-0 lg:min-h-0 lg:rounded-none lg:bg-transparent lg:p-0">
      <header className="mb-5 flex items-start gap-3 lg:hidden">
        {back && <Link href={back} aria-label="Back to Records" className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-bg text-heading hover:bg-surface-2"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="m15 18-6-6 6-6"/></svg></Link>}
        <div className="min-w-0 flex-1"><h1 className={`text-[28px] leading-tight text-heading ${back ? 'flex min-h-11 items-center' : ''}`}>{title}</h1>{subtitle && <p className="mt-1 break-words text-sm text-muted">{subtitle}</p>}</div>
        {right && <div className="shrink-0">{right}</div>}
      </header>
      <div className="hidden lg:block"><PageHeader title={desktopTitle} back={desktopBack} subtitle={subtitle} right={right}/></div>
      {children}
    </div>
  </AppShell>;
}

export function RecordsIcon({ warning = false }: { warning?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-6 shrink-0">{warning ? <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v.5"/></> : <><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></>}</svg>;
}
