import Link from 'next/link';
import { AppShell, Card, PageHeader } from '../../components/layout';
import { ReviewerCodeForm, RoleSwitch, SeedButton } from '../../components/client';
import { ThemeSelector } from '../../components/ThemeSelector';
import { getRole, reviewerCodeRequired, reviewerUnlocked } from '../_server';

export const dynamic = 'force-dynamic';

const LINKS = [
  { href: '/about#decisions', title: 'How decisions work', detail: 'Rules decide first; the AI only summarises' },
  { href: '/audit', title: 'Deal records', detail: 'Check that no step was changed' },
  { href: '/fairness', title: 'Fairness results', detail: 'How we test the AI for bias' },
  { href: '/about#limitations', title: 'Limitations', detail: 'What this demo does not do' },
  { href: '/about', title: 'About', detail: 'PayPal AI Hackathon 2026' },
];

export default async function MenuPage() {
  const role = await getRole();
  const codeRequired = reviewerCodeRequired();
  const unlocked = await reviewerUnlocked();
  return (
    <AppShell active="Menu">
      <PageHeader title="Menu"/>
      <div className="mx-auto max-w-xl space-y-3">
        <section aria-labelledby="demo-settings">
          <h2 id="demo-settings" className="mb-3 text-[15px] font-bold text-heading">Demo settings</h2>
          <Card className="divide-y divide-line py-0">
            <div className="py-4"><p className="mb-3 text-sm font-semibold text-heading">View as</p><RoleSwitch current={role}/></div>
            {codeRequired && <div className="py-4"><ReviewerCodeForm unlocked={unlocked}/></div>}
            <div className="py-4"><p className="mb-3 text-sm font-semibold text-heading">Appearance</p><ThemeSelector/></div>
            <div className="py-4"><p className="mb-1 text-sm font-semibold text-heading">Demo data</p><p className="mb-3 text-sm text-muted">Example deals with demo payments (no real money).</p><SeedButton role={role}/></div>
          </Card>
        </section>
        <section aria-labelledby="about-transparency" className="pt-3">
          <h2 id="about-transparency" className="mb-3 text-[15px] font-bold text-heading">About &amp; transparency</h2>
        <Card className="py-1">
          <ul>
            {role === 'reviewer' && <li className="border-b border-line"><Link href="/reviewer/oversight" className="flex min-h-[60px] items-center justify-between gap-3 py-2"><span><span className="block text-sm font-semibold text-heading">Reviewer oversight</span><span className="text-sm text-muted">Disputes, deadlines and audit health · read-only</span></span><span aria-hidden="true" className="text-muted">›</span></Link></li>}
            {LINKS.map((l) => (
              <li key={l.href} className="border-b border-line last:border-0">
                <Link href={l.href} className="flex min-h-[60px] items-center justify-between gap-3 py-2">
                  <span><span className="block text-sm font-semibold text-heading">{l.title}</span><span className="text-sm text-muted">{l.detail}</span></span>
                  <span aria-hidden="true" className="text-muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        </section>
      </div>
    </AppShell>
  );
}
