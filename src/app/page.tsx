import Link from 'next/link';
import { verifyChain } from '../lib/audit/chain';
import { AmountCard, DealListItem, StatusPill } from '../components/ui';
import { AppShell, Card, EmptyState, Notice, SectionTitle } from '../components/layout';
import { SeedButton } from '../components/client';
import { isActive, isReserved, money, nextAction, timeLeft } from '../components/view';
import { data, getRole, simulatedPayPal } from './_server';

export const dynamic = 'force-dynamic';

const ACTION_LABEL = {
  'accept-terms': 'Accept terms', pay: 'Pay', 'wait-approval': 'Approve on PayPal', ship: 'Add tracking',
  'confirm-or-dispute': 'Confirm or dispute', 'add-evidence': 'Add evidence', review: 'Review dispute', 'ship-return': 'Ship the item back', none: '',
} as const;

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
  const todo = deals
    .map((d) => ({ d, action: nextAction(d.status, role) }))
    .filter((x) => x.action !== 'none' && !(x.action === 'accept-terms' && role !== 'reviewer' && ctx.repo.listAcceptances(x.d.id).includes(role as 'buyer' | 'seller')))
    .slice(0, 6);
  const chains = deals.map((d) => verifyChain(ctx.repo.readEvents(d.id)));
  const verified = chains.filter((c) => c.ok).length;

  return (
    <AppShell active="Home">
      <header className="mb-5 flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-surface-2 font-extrabold text-heading">{role[0]!.toUpperCase()}</span>
        <div><p className="text-xs text-muted">Demo account · switch role in Menu</p><h1 className="text-base font-bold capitalize text-heading">Hi, demo {role}</h1></div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <AmountCard
            amount={money(reserved)}
            stats={[{ label: 'Active', value: String(active) }, { label: 'In dispute', value: String(inDispute) }, { label: 'Completed', value: String(completed) }]}
            {...(role === 'seller' ? { actionHref: '/deals/new', actionLabel: '+ New deal' }
              : role === 'reviewer' ? { actionHref: '/deals?filter=review', actionLabel: `Review queue (${reviewQueue.length})` }
              : { actionHref: '/deals', actionLabel: 'View my deals' })}
          />

          <SectionTitle right={<Link href="/deals" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-heading underline-offset-4 hover:underline">See all</Link>}>
            {role === 'reviewer' && reviewQueue.length ? 'Waiting for review' : 'Recent deals'}
          </SectionTitle>
          {shown.length === 0 ? (
            <EmptyState title="No deals yet">
              <p className="mb-4">Load labelled demo deals (simulated PayPal) to see every status, or create a new deal as the seller.</p>
              <SeedButton role={role}/>
            </EmptyState>
          ) : (
            <div className="space-y-2">
              {shown.map((d) => <DealListItem key={d.id} href={`/deals/${d.id}`} title={d.item} amount={money(d.amount)} status={d.status}/>)}
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          <div>
            <SectionTitle>Needs your action</SectionTitle>
            {todo.length === 0 ? <Notice>Nothing waiting for the demo {role}. Switch role in Menu to act as another party.</Notice> : (
              <ul className="space-y-2">
                {todo.map(({ d, action }) => {
                  const left = d.status === 'AUTHORIZED' ? timeLeft(d.shipBy, now) : d.status === 'IN_INSPECTION' ? timeLeft(d.inspectionUntil, now) : d.status === 'DISPUTED' ? timeLeft(d.evidenceUntil, now) : d.status === 'RETURN_REQUESTED' ? timeLeft(d.returnBy, now) : null;
                  return (
                    <li key={d.id}>
                      <Link href={action === 'review' ? `/deals/${d.id}/review` : action === 'add-evidence' ? `/deals/${d.id}/evidence` : action === 'pay' || (action === 'accept-terms' && role === 'buyer') ? `/deals/${d.id}/checkout` : `/deals/${d.id}`}
                        className="flex min-h-[60px] items-center justify-between gap-3 rounded-[18px] border border-line bg-surface p-3 hover:bg-surface-2">
                        <span className="min-w-0"><span className="block break-words text-sm font-bold text-heading">{ACTION_LABEL[action]}</span><span className="block break-words text-xs text-muted">{d.item}{left ? ` · ${left}` : ''}</span></span>
                        <StatusPill status={d.status}/>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {deals.length > 0 && (
            <Card>
              <p className="text-xs text-muted">Audit & verification</p>
              <p className="mt-1 text-sm font-bold" style={{ color: verified === chains.length ? 'var(--success-text)' : 'var(--warning-text)' }}>
                {verified === chains.length ? `All ${chains.length} chains verified` : `${chains.length - verified} of ${chains.length} chains failed`}
              </p>
              <Link href="/audit" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-heading underline-offset-4 hover:underline">Open audit log</Link>
            </Card>
          )}

          {simulatedPayPal() && <Notice tone="warning">Simulated PayPal mode is on. Money steps are recorded as simulated; nothing is sent to PayPal.</Notice>}
          <Notice>Sandbox demo. HalcyVault is a dispute-mediation prototype, not a licensed escrow service, and does not handle real money.</Notice>
        </aside>
      </div>
    </AppShell>
  );
}
