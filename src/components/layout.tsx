import type { ReactNode } from 'react';
import { BottomNav } from './ui';
import { DesktopNavigation } from './DesktopNavigation';
import { getRole, simulatedPayPal } from '../app/_server';

// Keep presentation primitives importable from client components without server cookie access.
export { PageHeader, Card, SectionTitle, Notice, EmptyState } from './layoutPrimitives';
type Active = 'Home' | 'Deals' | 'Audit' | 'Menu';

/** Persistent desktop shell; mobile keeps its existing geometry and floating navigation. */
export async function AppShell({ active, children, mobileFullBleed = false }: { active?: Active; children: ReactNode; mobileFullBleed?: boolean }) {
  const role = await getRole();
  return (
    <div className="min-h-screen bg-bg">
      <DesktopNavigation active={active} role={role} simulated={simulatedPayPal()}/>
      <div className="fixed inset-x-0 bottom-0 z-20 print:hidden lg:hidden">
        <BottomNav active={active}/>
      </div>
      <div className="desktop-main-area">
        <main id="main-content" tabIndex={-1} className={`desktop-content hv-page mx-auto min-w-0 w-full max-w-[1100px] pb-32 lg:px-10 lg:pb-12 lg:pt-10 ${mobileFullBleed ? 'px-0 pt-0' : 'px-5 pt-6'}`}>{children}</main>
      </div>
    </div>
  );
}
