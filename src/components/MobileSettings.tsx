import { MobilePanel } from './MobilePanel';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { MobileBrandHeader } from './MobileBrandHeader';
import { SettingsIcon, type SettingsIconName } from './SettingsIcon';
import { ReviewerCodeForm, RoleSwitch, SeedButton } from './client';
import { ThemeSelector } from './ThemeSelector';
import type { Role } from './view';

function Chevron() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"><path d="m9 5 7 7-7 7"/></svg>;
}
function RowContent({ title, icon }: { title: string; icon: SettingsIconName }) {
  return <><span className="shrink-0 text-[var(--inspection-text)]"><SettingsIcon name={icon}/></span><span className="min-w-0 flex-1 text-sm font-medium text-heading">{title}</span><Chevron/></>;
}
const row = 'flex min-h-[60px] items-center gap-3 rounded-[20px] px-4 py-3 hover:bg-surface-2';
function SettingsDisclosure({ title, icon, children }: { title: string; icon: SettingsIconName; children: ReactNode }) {
  return <li><details name="mobile-settings" className="group overflow-hidden rounded-[20px] border border-line bg-bg">
    <summary className={`${row} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}><RowContent title={title} icon={icon}/></summary>
    <div className="border-t border-line p-4">{children}</div>
  </details></li>;
}
function SettingsDestination({ href, title, icon }: { href: string; title: string; icon: SettingsIconName }) {
  return <li><Link href={href} className={`${row} border border-line bg-bg`}><RowContent title={title} icon={icon}/></Link></li>;
}

export function MobileSettings({ role, codeRequired, unlocked, simulated }: { simulated: boolean; role: Role; codeRequired: boolean; unlocked: boolean }) {
  return <div className="lg:hidden">
    <MobileBrandHeader role={role}/>
    <MobilePanel role="region" aria-labelledby="mobile-settings-title">
      <h1 id="mobile-settings-title" className="mb-6 text-[28px] leading-tight text-heading">Settings</h1>
      <ul aria-label="Settings options" className="space-y-3">
        <SettingsDisclosure title="Demo role" icon="role">
          <p className="mb-3 text-sm text-muted">Choose which side of a deal you want to explore.</p>
          <RoleSwitch current={role}/>
          <p className="mt-3 text-sm leading-relaxed text-muted">These are demo roles, not real accounts.{codeRequired ? ' Reviewer actions require the access code.' : ' Demo reviewer actions are available in the Reviewer view.'}</p>
          {codeRequired && <div className="mt-4 border-t border-line pt-4"><p className="mb-3 text-sm font-semibold text-heading">Reviewer access · {unlocked ? 'Code saved' : 'Code required'}</p><ReviewerCodeForm unlocked={unlocked} id="mobile-reviewer-code"/></div>}
        </SettingsDisclosure>
        <SettingsDisclosure title="Appearance" icon="appearance">
          <p className="mb-4 text-sm leading-relaxed text-muted">Choose a theme, or follow your device. Saved on this browser when storage is available.</p>
          <ThemeSelector preview/>
        </SettingsDisclosure>
        <SettingsDisclosure title="Demo data" icon="data">
          <p className="mb-4 text-sm leading-relaxed text-muted">Explore labelled examples of delivery, disputes and human decisions. Examples use Demo mode (no real money). No real money moves.</p>
          <SeedButton role={role}/>
        </SettingsDisclosure>
        {role === 'reviewer' && <SettingsDestination href="/reviewer/oversight" title="Review desk" icon="oversight"/>}
        <SettingsDestination href="/how-it-works" title="How it works" icon="rules"/>
        <SettingsDestination href="/fairness" title="Fairness results" icon="fairness"/>
        <SettingsDestination href="/about#limitations" title="Limitations" icon="limits"/>
        <SettingsDestination href="/about" title="About Creident" icon="about"/>
      </ul>
      <footer className="mt-6 border-t border-line pt-4 text-sm leading-relaxed text-muted"><p>{simulated ? "Demo mode (no real money)" : 'PayPal Sandbox'} · No real sign-in.</p><p>Roles are for exploring this demo. No real money moves.</p></footer>
    </MobilePanel>
  </div>;
}
