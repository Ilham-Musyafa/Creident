import Link from 'next/link';
import { MobileSettings } from '../../components/MobileSettings';
import { AppShell, Card, PageHeader } from '../../components/layout';
import { ReviewerCodeForm, RoleSwitch, SeedButton } from '../../components/client';
import { ThemeSelector } from '../../components/ThemeSelector';
import { SettingsIcon, type SettingsIconName } from '../../components/SettingsIcon';
import { getRole, simulatedPayPal, reviewerCodeRequired, reviewerUnlocked } from '../_server';

export const dynamic = 'force-dynamic';

const LINKS: { href: string; title: string; detail: string; icon: SettingsIconName }[] = [
  { href: '/how-it-works', title: 'How it works', detail: 'Rules, evidence and human dispute review', icon: 'rules' },
  { href: '/audit', title: "Deal history", detail: 'Read each step and check the history', icon: 'records' },
  { href: '/fairness', title: 'Fairness results', detail: 'Recorded AI answers, sample sizes and limits', icon: 'fairness' },
  { href: '/about#limitations', title: 'Limitations', detail: 'What this demo does and does not do', icon: 'limits' },
  { href: '/about', title: 'About Creident', detail: 'The prototype and its approach', icon: 'about' },
];
const SECTIONS: { href: string; title: string; icon: SettingsIconName }[] = [
  { href: '#demo-role', title: 'Demo role', icon: 'role' },
  { href: '#appearance', title: 'Appearance', icon: 'appearance' },
  { href: '#demo-data', title: 'Demo data', icon: 'data' },
  { href: '#transparency', title: 'Learn & verify', icon: 'records' },
];
function SectionHeading({ id, title, detail, icon }: { id: string; title: string; detail: string; icon: SettingsIconName }) {
  return <div className="mb-5 flex items-start gap-3">
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-heading"><SettingsIcon name={icon}/></span>
    <div className="min-w-0"><h2 id={id} className="text-base font-bold text-heading">{title}</h2><p className="mt-1 text-sm leading-relaxed text-muted">{detail}</p></div>
  </div>;
}
function SettingsLink({ href, title, detail, icon }: { href: string; title: string; detail: string; icon: SettingsIconName }) {
  return <Link href={href} className="group flex min-h-16 items-center gap-3 rounded-xl px-3 py-4 transition-colors hover:bg-surface-2">
    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-heading"><SettingsIcon name={icon}/></span>
    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-heading">{title}</span><span className="mt-1 block text-sm leading-relaxed text-muted">{detail}</span></span>
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-muted"><path d="m9 5 7 7-7 7"/></svg>
  </Link>;
}

export default async function MenuPage() {
  const role = await getRole();
  const simulated = simulatedPayPal();
  const codeRequired = reviewerCodeRequired();
  const unlocked = await reviewerUnlocked();
  return (
    <AppShell active="Menu" mobileFullBleed>
      <MobileSettings simulated={simulated} role={role} codeRequired={codeRequired} unlocked={unlocked}/>
      <div className="hidden lg:block">
      <PageHeader title="Settings" subtitle="Your demo workspace, appearance and useful links."/>
      <div className="grid items-start gap-6 lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside aria-label="Demo workspace" className="min-w-0 space-y-5 lg:sticky lg:top-6">
          <Card className="p-5">
            <div className="flex items-center gap-3 lg:flex-col lg:items-start">
              <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-[16px] bg-surface-2 text-lg font-bold text-heading">{role[0]!.toUpperCase()}</span>
              <div className="min-w-0"><p className="text-base font-bold text-heading">Demo workspace</p><p className="mt-1 text-sm capitalize text-muted">{role} view</p></div>
            </div>
            <div className="mt-4 border-t border-line pt-4"><span className="inline-flex rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-heading">{simulated ? "Demo mode (no real money)" : 'PayPal Sandbox'}</span><p className="mt-3 text-sm leading-relaxed text-muted">No real sign-in. Roles are for exploring this demo.</p></div>
          </Card>
          <nav aria-label="Settings sections" className="hidden lg:block">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted">On this page</p>
            <ul className="space-y-1">{SECTIONS.map(item => <li key={item.href}><Link href={item.href} className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-heading hover:bg-surface-2"><SettingsIcon name={item.icon}/>{item.title}</Link></li>)}</ul>
          </nav>
        </aside>

        <div className="min-w-0 space-y-5">
          <section id="demo-role" tabIndex={-1} aria-labelledby="demo-role-title" className="scroll-mt-6">
            <Card className="p-5 sm:p-6">
              <SectionHeading id="demo-role-title" title="Demo role" detail="Choose which side of a deal you want to explore." icon="role"/>
              <p className="mb-3 text-sm font-semibold text-heading">View as</p>
              <RoleSwitch current={role}/>
              <p className="mt-3 text-sm leading-relaxed text-muted">These are demo roles, not real accounts.{codeRequired ? ' Reviewer actions require the access code.' : ' Demo reviewer actions are available in the Reviewer view.'}</p>
              {codeRequired && <div className="mt-5 space-y-3 border-t border-line pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-heading">Reviewer access</h3><span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-heading">{unlocked ? 'Code saved' : 'Code required'}</span></div>
                <ReviewerCodeForm unlocked={unlocked}/>
              </div>}
            </Card>
          </section>

          <section id="appearance" tabIndex={-1} aria-labelledby="appearance-title" className="scroll-mt-6">
            <Card className="p-5 sm:p-6">
              <SectionHeading id="appearance-title" title="Appearance" detail="Choose a theme, or follow your device. Saved on this browser when storage is available." icon="appearance"/>
              <ThemeSelector preview/>
            </Card>
          </section>

          <section id="demo-data" tabIndex={-1} aria-labelledby="demo-data-title" className="scroll-mt-6">
            <Card className="p-5 sm:p-6">
              <SectionHeading id="demo-data-title" title="Demo data" detail="Explore labelled examples of delivery, disputes and human decisions." icon="data"/>
              <div className="rounded-[16px] border border-line bg-bg p-4"><p className="mb-4 text-sm leading-relaxed text-muted">Examples use Demo mode (no real money). No real money moves.</p><SeedButton role={role}/></div>
            </Card>
          </section>

          <section id="transparency" tabIndex={-1} aria-labelledby="transparency-title" className="scroll-mt-6">
            <Card className="p-2 sm:p-3">
              <div className="px-3 pt-3"><SectionHeading id="transparency-title" title="Learn & verify" detail="Read the rules, deal history and demo limits." icon="records"/></div>
              <ul className="divide-y divide-line">
                {role === 'reviewer' && <li><SettingsLink href="/reviewer/oversight" title="Review desk" detail="Problems, deadlines and history checks · read-only" icon="oversight"/></li>}
                {LINKS.map(item => <li key={item.href}><SettingsLink {...item}/></li>)}
              </ul>
            </Card>
          </section>
        </div>
      </div>
      </div>
    </AppShell>
  );
}
