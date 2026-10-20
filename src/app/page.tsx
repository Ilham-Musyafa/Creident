import { AmountCard, DealListItem } from '../components/ui';
import { AppShell, EmptyState, Notice, SectionTitle } from '../components/layout';
import { SeedButton } from '../components/client';
import { isActive, isReserved, money, timeLeft } from '../components/view';
import { data, getRole } from './_server';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const role = await getRole();
  const ctx = data();
  const deals = ctx.repo.listTransactions();
  const now = ctx.now();
  const reserved = deals.filter((d) => isReserved(d.status, d.captured)).reduce((sum, d) => sum + Number(d.amount), 0);
  const inDispute = deals.filter((d) => d.status === 'DISPUTED' || d.status === 'UNDER_REVIEW').length;
  const completed = deals.filter((d) => d.status === 'COMPLETED').length;
  const active = deals.filter((d) => isActive(d.status)).length;
  const reviewQueue = deals.filter((d) => d.status === 'UNDER_REVIEW');
  const shown = role === 'reviewer' && reviewQueue.length ? reviewQueue : deals.slice(0, 5);

  return (
    <AppShell active="Home">
      <header className="mb-5 flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-surface-2 font-extrabold text-heading">{role[0]!.toUpperCase()}</span>
        <div><p className="text-xs text-muted">Demo account · switch role in Menu</p><h1 className="text-base font-bold capitalize text-heading">Hi, demo {role}</h1></div>
      </header>

      <AmountCard
        amount={money(reserved)}
        stats={[{ label: 'Active', value: String(active) }, { label: 'In dispute', value: String(inDispute) }, { label: 'Completed', value: String(completed) }]}
        {...(role === 'seller' ? { actionHref: '/deals/new', actionLabel: '+ New deal' }
          : role === 'reviewer' ? { actionHref: '/deals?filter=review', actionLabel: `Review queue (${reviewQueue.length})` }
          : { actionHref: '/deals', actionLabel: 'View my deals' })}
      />

      <SectionTitle right={<a href="/deals" className="text-sm font-semibold text-heading underline-offset-4 hover:underline">See all</a>}>
        {role === 'reviewer' && reviewQueue.length ? 'Waiting for review' : 'Recent deals'}
      </SectionTitle>
      {shown.length === 0 ? (
        <EmptyState title="No deals yet">
          <p className="mb-4">Load labelled demo deals (simulated PayPal) to see every status, or create a new deal as the seller.</p>
          <SeedButton role={role}/>
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {shown.map((d) => <DealListItem key={d.id} href={`/deals/${d.id}`} title={d.item} amount={money(d.amount)} status={d.status}
            icon={<span className="text-base">◇</span>}/>)}
        </div>
      )}
      {shown.some((d) => d.status === 'IN_INSPECTION') && (
        <p className="mt-3 text-xs text-muted">Inspection windows: {shown.filter((d) => d.status === 'IN_INSPECTION').map((d) => `${d.item.replace('[Demo] ', '')} ${timeLeft(d.inspectionUntil, now) ?? 'ended'}`).join(' · ')}</p>
      )}
      <div className="mt-6"><Notice>Sandbox demo. HalcyVault is a dispute-mediation prototype, not a licensed escrow service, and does not handle real money.</Notice></div>
    </AppShell>
  );
}
