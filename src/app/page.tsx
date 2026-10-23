import Link from 'next/link';
import { DemoGuide } from '../components/DemoGuide';
import { BrandLogo } from '../components/BrandLogo';
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
    .map((entry) => ({ ...entry, deadline: entry.d.status === 'AUTHORIZED' ? entry.d.shipBy : entry.d.status === 'IN_INSPECTION' ? entry.d.inspectionUntil : entry.d.status === 'DISPUTED' ? entry.d.evidenceUntil : entry.d.status === 'RETURN_REQUESTED' ? entry.d.returnBy : null }))
    .sort((a, b) => (a.deadline ? Date.parse(a.deadline) : Infinity) - (b.deadline ? Date.parse(b.deadline) : Infinity));
  const actionCount = todo.length;
  const shipCount = todo.filter(entry => entry.action === 'ship').length;
  const roleSummary = role === 'seller' ? `${shipCount} deal${shipCount === 1 ? ' needs' : 's need'} shipping · ${actionCount} seller task${actionCount === 1 ? '' : 's'}` : role === 'reviewer' ? `${reviewQueue.length} dispute${reviewQueue.length === 1 ? '' : 's'} awaiting a human decision` : `${actionCount} deal${actionCount === 1 ? '' : 's'} waiting for you`;
  const actionTitle = role === 'buyer' ? 'Waiting for you' : role === 'seller' ? 'Your seller tasks' : 'Waiting for your review';
  const draftDeal = deals.find(d => d.status === 'DRAFT');
  const disputedDeal = deals.find(d => d.status === 'DISPUTED');
  const reviewDeal = reviewQueue[0];
  const exampleDeal = disputedDeal ?? reviewDeal ?? deals[0];
  const guideSteps = [
    { title: 'Explore a deal', detail: role === 'seller' ? 'Create terms as the seller.' : 'Check the agreed terms as the buyer.', href: role === 'seller' ? '/deals/new' : role === 'buyer' && draftDeal ? `/deals/${draftDeal.id}/checkout` : '/deals' },
    { title: 'See a dispute', detail: 'Read the evidence and agreed checks.', href: exampleDeal ? `/deals/${exampleDeal.id}` : '/deals' },
    { title: 'Human decision', detail: role === 'reviewer' ? 'Review the recommendation; a person decides.' : 'Switch to Reviewer in Menu to explore review.', href: role === 'reviewer' && reviewDeal ? `/deals/${reviewDeal.id}/review` : '/menu' },
    { title: 'Check the record', detail: 'Inspect events and verify the audit chain.', href: '/audit' },
  ];
  const chains = deals.map((d) => verifyChain(ctx.repo.readEvents(d.id)));
  const verified = chains.filter((c) => c.ok).length;

  return (
    <AppShell active="Home">
      <header className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div className="-ml-3"><BrandLogo/></div>
        <Link href="/menu" aria-label={`Demo ${role}: switch role in Menu`} className="flex min-h-11 min-w-11 shrink-0 flex-col items-center gap-1 rounded-xl p-1 text-heading hover:bg-surface-2">
          <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-surface-2 font-extrabold">{role[0]!.toUpperCase()}</span>
          <span className="text-[11px] font-semibold capitalize">{role}</span>
        </Link>
      </header>
      <h1 className="sr-only lg:hidden">Home</h1>
      <header className="mb-5 hidden items-center gap-3 lg:flex">
        <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-surface-2 font-extrabold text-heading">{role[0]!.toUpperCase()}</span>
        <div><p className="text-xs text-muted">Demo account · switch role in Menu</p><h1 className="text-base font-bold capitalize text-heading">Hi, demo {role}</h1></div>
      </header>

      <p className="mb-4 text-sm text-muted">{roleSummary}</p>
      <DemoGuide steps={guideSteps}/>

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


        </div>

        <aside className="min-w-0 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div>
            <SectionTitle>{actionTitle}{actionCount > 0 ? ` (${actionCount})` : ''}</SectionTitle>
            {actionCount > 0 && <p className="mb-3 text-xs text-muted">Deadlines first, soonest at the top.</p>}
            {todo.length === 0 ? <p className="text-sm leading-relaxed text-muted">You’re all caught up.<br/><Link href="/menu" className="inline-flex min-h-11 items-center font-semibold text-heading hover:underline">Switch demo role →</Link></p> : (
              <ul className="space-y-2">
                {todo.slice(0, 6).map(({ d, action, deadline }) => {
                  const remaining = deadline ? timeLeft(deadline, now) : null;
                  const left = remaining ? remaining.replace(/(\d+)([dhm])/g, (_, value: string, unit: string) => `${value} ${{ d: 'day', h: 'hour', m: 'minute' }[unit]}${value === '1' ? '' : 's'}`) : deadline ? 'Deadline passed' : null;
                  return (
                    <li key={d.id}>
                      <Link href={action === 'review' ? `/deals/${d.id}/review` : action === 'add-evidence' ? `/deals/${d.id}/evidence` : action === 'pay' || (action === 'accept-terms' && role === 'buyer') ? `/deals/${d.id}/checkout` : `/deals/${d.id}`}
                        className="flex min-h-[60px] items-center justify-between gap-3 rounded-[18px] border border-line bg-surface p-3 hover:bg-surface-2">
                        <span className="min-w-0"><span className="block break-words text-sm font-bold text-heading">{ACTION_LABEL[action]}</span><span className="block break-words text-xs text-muted">{d.item}{left ? ` · ${left}` : ''}</span></span>
                        <StatusPill status={d.status} className="w-32 shrink-0 justify-center text-center text-balance"/>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {actionCount > 6 && <Link href="/deals" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-heading underline">View all deals</Link>}
          </div>

          {deals.length > 0 && (
            <Card>
              <p className="text-xs text-muted">Audit & verification</p>
              <p className="mt-1 text-sm font-bold" style={{ color: verified === chains.length ? 'var(--success-text)' : 'var(--warning-text)' }}>
                {verified === chains.length ? `${chains.length} records verified on this server` : `${chains.length - verified} of ${chains.length} records changed`}
              </p>
              <Link href="/audit" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-heading underline-offset-4 hover:underline">Open deal records</Link>
            </Card>
          )}

          <div className="border-t border-line pt-4">
            <span className="inline-flex rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-heading">Sandbox demo</span>
            <p className="mt-2 text-xs leading-relaxed text-muted">{simulatedPayPal() ? 'Demo payments only. No real money moves.' : 'A dispute-mediation prototype. No real money.'}</p>
            <Link href="/about#limitations" className="inline-flex min-h-11 items-center text-xs font-semibold text-heading hover:underline">View limitations</Link>
          </div>
        </aside>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          {shown.length > 0 && <>
          <SectionTitle right={<Link href="/deals" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-heading underline-offset-4 hover:underline">See all</Link>}>
            {role === 'reviewer' && reviewQueue.length ? 'Waiting for review' : 'Recent transactions'}
          </SectionTitle>
            <div className="hv-stagger space-y-2">
              {shown.map((d) => <DealListItem key={d.id} href={`/deals/${d.id}`} title={d.item} amount={money(d.amount)} status={d.status}/>)}
            </div>
          </>}
        </div>
      </div>
    </AppShell>
  );
}
