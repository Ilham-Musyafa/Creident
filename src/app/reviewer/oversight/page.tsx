import Link from 'next/link';
import { AppShell, Notice, PageHeader } from '../../../components/layout';
import { OversightClient } from '../../../components/oversight/OversightClient';
import { getRole, reviewerUnlocked } from '../../_server';

export const dynamic = 'force-dynamic';
export default async function OversightPage() {
  const role = await getRole(); const unlocked = role === 'reviewer' && await reviewerUnlocked();
  return <AppShell active="Menu">
    <PageHeader title="Reviewer oversight" back="/menu" subtitle="Disputes, deadlines and audit health. Read-only · Sandbox demo."/>
    {role !== 'reviewer' ? <Notice>Only the reviewer can open this dashboard. <Link href="/menu" className="underline">Switch role in Menu.</Link></Notice>
      : !unlocked ? <Notice tone="warning">Enter the reviewer access code in <Link href="/menu" className="underline">Menu</Link> to open this dashboard.</Notice>
        : <OversightClient licenseKey={process.env.AG_STUDIO_LICENSE_KEY || undefined}/>}
  </AppShell>;
}
