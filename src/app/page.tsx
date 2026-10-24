import { DesktopHome } from '../components/DesktopHome';
import { sortTransactionRows, transactionRow } from '../components/transactionsView';
import { MobileHome } from '../components/MobileHome';
import { verifyChain } from '../lib/audit/chain';
import { AppShell } from '../components/layout';
import { isActive, isReserved, money } from '../components/view';
import { data, getRole, simulatedPayPal } from './_server';

export const dynamic = 'force-dynamic';

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
  const accepted = new Map(deals.filter(tx => tx.status === 'DRAFT').map(tx => [tx.id, ctx.repo.listAcceptances(tx.id)]));
  const actionTitle = role === 'buyer' ? 'Waiting for you' : role === 'seller' ? 'Your seller tasks' : 'Waiting for your review';
  const chains = deals.map((d) => verifyChain(ctx.repo.readEvents(d.id)));
  const verified = chains.filter((c) => c.ok).length;

  const rows = deals.map(tx => transactionRow(tx, role, now, accepted.get(tx.id) ?? []));
  const actionCount = rows.filter(row => row.needsAction).length;
  const actions = sortTransactionRows(rows.filter(row => row.needsAction)).slice(0, 6);
  const recent = shown.map(tx => rows.find(row => row.id === tx.id)!);

  const homeData = { role, approvedAmount: money(reserved), approvedCount: reservedDeals,
    active, inDispute, completed, actionCount, actionTitle, actions, recent,
    recentTitle: role === 'reviewer' && reviewQueue.length ? 'Review queue' : 'Recent transactions',
    verified, total: chains.length, simulated: simulatedPayPal() };
  return <AppShell active="Home"><DesktopHome key={role} {...homeData}/><MobileHome key={role} {...homeData}/></AppShell>;
}
