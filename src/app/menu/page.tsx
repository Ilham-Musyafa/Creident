import Link from 'next/link';
import { AppShell, Card, PageHeader } from '../../components/layout';
import { RoleSwitch, SeedButton } from '../../components/client';
import { ThemeSelector } from '../../components/ThemeSelector';
import { getRole } from '../_server';

export const dynamic = 'force-dynamic';

const LINKS = [
  { href: '/about#decisions', title: 'How decisions are made', detail: 'Rules R1–R7 and the role of the AI' },
  { href: '/audit', title: 'Audit & verification', detail: 'Check the hash chains' },
  { href: '/about#limitations', title: 'Limitations', detail: 'Sandbox demo, not an escrow service' },
  { href: '/about', title: 'About HalcyVault', detail: 'PayPal AI Hackathon 2026' },
];

export default async function MenuPage() {
  const role = await getRole();
  return (
    <AppShell active="Menu">
      <PageHeader title="Menu"/>
      <div className="mx-auto max-w-xl space-y-3">
        <Card><p className="mb-3 text-xs text-muted">Act as (demo)</p><RoleSwitch current={role}/></Card>
        <Card><p className="mb-3 text-xs text-muted">Appearance</p><ThemeSelector/></Card>
        <Card className="py-1">
          <ul>
            {LINKS.map((l) => (
              <li key={l.href} className="border-b border-line last:border-0">
                <Link href={l.href} className="flex min-h-[60px] items-center justify-between gap-3 py-2">
                  <span><span className="block text-sm font-semibold text-heading">{l.title}</span><span className="text-xs text-muted">{l.detail}</span></span>
                  <span aria-hidden="true" className="text-muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card><p className="mb-3 text-xs text-muted">Demo data (labelled, simulated PayPal)</p><SeedButton role={role}/></Card>
      </div>
    </AppShell>
  );
}
