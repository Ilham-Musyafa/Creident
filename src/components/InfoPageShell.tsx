import type { ReactNode } from 'react';
import { getRole } from '../app/_server';
import { AppShell, PageHeader } from './layout';
import { MobileBrandHeader } from './MobileBrandHeader';
import { MobilePanel } from './MobilePanel';

/** Records-style mobile explainer surface; desktop retains the original PageHeader. */
export async function InfoPageShell({ title, subtitle, children }: {
  title: string; subtitle: string; children: ReactNode;
}) {
  const role = await getRole();
  return <AppShell active="Menu" mobileFullBleed>
    <div className="lg:hidden"><MobileBrandHeader role={role}/></div>
    <MobilePanel className="info-panel">
      <PageHeader title={title} back="/menu" subtitle={subtitle}/>
      {children}
    </MobilePanel>
  </AppShell>;
}
