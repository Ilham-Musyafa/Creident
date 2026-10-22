import Link from 'next/link';
import { verifyChain } from '../lib/audit/chain';
import { AmountCard, ButtonLink, DealListItem, StatusPill } from '../components/ui';
import { AppShell, Card, SectionTitle } from '../components/layout';
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
  const reservedList = deals.filter((d) => isReserved(d.status, d.captured));
  const reserved = reservedList.reduce((sum, d) => sum + Number(d.amount), 0);
  const reservedDeals = reservedList.length;
  const inDispute = deals.filter((d) => d.status === 'DISPUTED' || d.status === 'UNDER_REVIEW').length;
  const completed = deals.filter((d) => ['COMPLETED', 'PARTIALLY_REFUNDED'].includes(d.status)).length;
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
          {deals.length === 0 ? (
            <Card className="p-6 lg:p-8">
              <p className="text-xs font-semibold text-muted">Get started</p>
              <h2 className="mt-3 text-xl font-extrabold tracking-tight text-heading">{role === 'seller' ? 'Create your first deal' : role === 'reviewer' ? 'Your review queue starts here' : 'Your deals start here'}</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{role === 'seller' ? 'Agree on the terms, track delivery, and keep a record of every step.' : 'Explore labelled demo deals to see payments, delivery, and dispute review in action.'}</p>
              <div className="mt-6 space-y-3">
                {role === 'seller' && <ButtonLink href="/deals/new">+ New deal</ButtonLink>}
                <SeedButton role={role}/>
              </div>
              <p className="mt-3 text-xs text-muted">Example deals use demo payments (no real money).</p>
            </Card>
          ) : <AmountCard
            label={`Approved, waiting to be charged · ${reservedDeals} open deal${reservedDeals === 1 ? '' : 's'}`}
            amount={money(reserved)}
            stats={[{ label: 'Active', value: String(active) }, { label: 'In dispute', value: String(inDispute) }, { label: 'Completed', value: String(completed) }]}
            {...(role === 'seller' ? { actionHref: '/deals/new', actionLabel: '+ New deal' }
              : role === 'reviewer' ? { actionHref: '/deals?filter=review', actionLabel: `Review queue (${reviewQueue.length})` }
              : { actionHref: '/deals', actionLabel: 'View my deals' })}
          />}

          {shown.length > 0 && <>
          <SectionTitle right={<Link href="/deals" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-heading underline-offset-4 hover:underline">See all</Link>}>
            {role === 'reviewer' && reviewQueue.length ? 'Waiting for review' : 'Recent deals'}
          </SectionTitle>
            <div className="hv-stagger space-y-2">
              {shown.map((d) => <DealListItem key={d.id} href={`/deals/${d.id}`} title={d.item} amount={money(d.amount)} status={d.status}/>)}
            </div>
          </>}
        </div>

        <aside className="min-w-0 space-y-4">
          <div>
            <SectionTitle>Needs your action{todo.length > 0 ? ` (${todo.length})` : ''}</SectionTitle>
            {todo.length === 0 ? <p className="text-sm leading-relaxed text-muted">You’re all caught up.<br/><Link href="/menu" className="inline-flex min-h-11 items-center font-semibold text-heading hover:underline">Switch demo role →</Link></p> : (
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
                {verified === chains.length ? `All ${chains.length} records intact` : `${chains.length - verified} of ${chains.length} records changed`}
              </p>
              <Link href="/audit" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-heading underline-offset-4 hover:underline">Open deal records</Link>
            </Card>
          )}

          <div className="border-t border-line pt-4">
            <span className="inline-flex rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-heading">Sandbox demo</span>
            <p className="mt-2 text-xs leading-relaxed text-muted">{simulatedPayPal() ? 'Demo payments only. No real money moves.' : 'A dispute-mediation prototype. No real money.'}</p>
            <Link href="/about#limitations" className="inline-flex min-h-11 items-center text-xs font-semibold text-heading hover:underline">View limitations →</Link>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
