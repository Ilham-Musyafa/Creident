import Link from 'next/link';
import { AppShell, Notice, PageHeader } from '../../../components/layout';
import { OversightClient } from '../../../components/oversight/OversightClient';
import { getRole, reviewerUnlocked } from '../../_server';

export const dynamic = 'force-dynamic';
export default async function OversightPage() {
  const role = await getRole(); const unlocked = role === 'reviewer' && await reviewerUnlocked();
  return <AppShell>
    <PageHeader title="Review desk" back="/menu" subtitle="Disputes, deadlines and audit health. Read-only · Sandbox demo."/>
    {role !== 'reviewer' ? <Notice>Only the reviewer can open this dashboard. <Link href="/menu" className="inline-flex min-h-11 items-center font-semibold underline">Switch role in Settings.</Link></Notice>
      : !unlocked ? <Notice tone="warning">Enter the reviewer access code in <Link href="/menu" className="inline-flex min-h-11 items-center font-semibold underline">Menu</Link> to open this dashboard.</Notice>
        : <OversightClient licenseKey={process.env.AG_STUDIO_LICENSE_KEY || undefined}/>}
  </AppShell>;
}
