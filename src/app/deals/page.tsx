import Link from 'next/link';
import { DealListItem } from '../../components/ui';
import { AppShell, EmptyState, PageHeader } from '../../components/layout';
import { SeedButton } from '../../components/client';
import { isActive, money } from '../../components/view';
import { data, getRole } from '../_server';

export const dynamic = 'force-dynamic';

const FILTERS = { all: 'All', active: 'Active', review: 'Needs review', closed: 'Closed' } as const;
type Filter = keyof typeof FILTERS;

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const role = await getRole();
  const raw = (await searchParams).filter;
  const filter: Filter = raw && raw in FILTERS ? raw as Filter : 'all';
  const deals = data().repo.listTransactions().filter((d) =>
    filter === 'active' ? isActive(d.status)
      : filter === 'review' ? d.status === 'UNDER_REVIEW'
      : filter === 'closed' ? !isActive(d.status) : true);

  return (
    <AppShell active="Deals">
      <PageHeader title="Deals" subtitle={`Viewing as demo ${role}`}/>
      <nav aria-label="Filter deals" className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(FILTERS) as Filter[]).map((f) => (
          <Link key={f} href={f === 'all' ? '/deals' : `/deals?filter=${f}`} aria-current={f === filter ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${f === filter ? 'bg-strong text-on-strong' : 'border border-line bg-surface text-heading'}`}>{FILTERS[f]}</Link>
        ))}
      </nav>
      {deals.length === 0 ? (
        <EmptyState title={filter === 'all' ? 'No deals yet' : 'Nothing here'}>
          {filter === 'all' && <><p className="mb-4">Load labelled demo deals to explore every status.</p><SeedButton role={role}/></>}
        </EmptyState>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {deals.map((d) => <DealListItem key={d.id} href={`/deals/${d.id}`} title={d.item} amount={money(d.amount)} status={d.status}/>)}
        </div>
      )}
    </AppShell>
  );
}
