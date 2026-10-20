import { Suspense } from 'react';
import { AppShell, PageHeader } from '../../../components/layout';
import { PayPalReturn } from '../../../components/client';

export default function PayPalReturnPage() {
  return (
    <AppShell active="Deals">
      <PageHeader title="Back from PayPal (Sandbox)"/>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}><PayPalReturn/></Suspense>
    </AppShell>
  );
}
