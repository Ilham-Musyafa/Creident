import { recentHomeActivity } from '../components/homeActivity';
import { assistMode } from '../lib/ai/assist';
import { isPublicDemo } from '../lib/publicDemo';
import { DesktopHome } from '../components/DesktopHome';
import { matchesTransactionFilter, sortTransactionRows, sortHomeRows, sortActionRows, transactionRow } from '../components/transactionsView';
import { MobileHome } from '../components/MobileHome';
import { verifyChain } from '../lib/audit/chain';
import { AppShell } from '../components/layout';
import { isActive } from '../components/view';
import { data, getRole, simulatedPayPal } from './_server';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const role = await getRole();
  const ctx = data();
  const deals = ctx.repo.listTransactions();
  const now = ctx.now();
  const inDispute = deals.filter((d) => d.status === 'DISPUTED' || d.status === 'UNDER_REVIEW').length;
  const completed = deals.filter((d) => ['COMPLETED', 'PARTIALLY_REFUNDED'].includes(d.status)).length;
  const active = deals.filter((d) => isActive(d.status)).length;
  const reviewQueue = deals.filter((d) => d.status === 'UNDER_REVIEW');
  const shown = role === 'reviewer' && reviewQueue.length ? reviewQueue : deals.slice(0, 5);
  const accepted = new Map(deals.filter(tx => tx.status === 'DRAFT').map(tx => [tx.id, ctx.repo.listAcceptances(tx.id)]));
  const actionTitle = role === 'buyer' ? 'Waiting for you' : role === 'seller' ? 'Your seller tasks' : 'Waiting for your review';
  const chains = deals.map((d) => verifyChain(ctx.repo.readEvents(d.id)));
  const verified = chains.filter((c) => c.ok).length;

  const rows = deals.map(tx => transactionRow(tx, role, now, accepted.get(tx.id) ?? [], ctx.repo.readEvents(tx.id).find(event => event.type === 'TRANSACTION_CREATED')?.ts ?? null, ctx.repo.readEvents(tx.id).at(-1)?.ts ?? null));
  const actionCount = rows.filter(row => row.needsAction).length;
  const actions = sortActionRows(rows.filter(row => row.needsAction)).slice(0, 6);
  const recent = sortHomeRows(role === 'reviewer' && reviewQueue.length ? shown.map(tx => rows.find(row => row.id === tx.id)!) : rows).slice(0, 5);
  // Demo party IDs match the seed/create flow; reviewers use their actual review queue.
  const mobileDealIds = new Set(deals.filter(tx => role === 'reviewer'
    ? tx.status === 'UNDER_REVIEW'
    : role === 'buyer' ? tx.buyerId === 'buyer' : tx.sellerId === 'seller').map(tx => tx.id));
  const mobileRecent = sortHomeRows(rows.filter(row => mobileDealIds.has(row.id))).slice(0, 3);

  const statusTiles = ([['Waiting for you', 'action', 'Your actions'], ['In progress', 'active', 'Active deals'], ['Problem', 'review', 'Under review'], ['Closed', 'closed', 'Closed, including cancelled/refunded']] as const)
    .map(([label, filter, detail]) => ({ label, detail, href: `/deals?filter=${filter}`, count: rows.filter(row => matchesTransactionFilter(row, filter)).length }));
  const activity = recentHomeActivity(deals, role, id => ctx.repo.readEvents(id));
  const recordedAi = assistMode(ctx.aiEnv ?? process.env) === 'replay';
  const homeData = { role, statusTiles,
    active, inDispute, completed, actionCount, actionTitle, actions, recent,
    recentTitle: role === 'reviewer' && reviewQueue.length ? 'Review queue' : 'Recent deals',
    verified, total: chains.length, simulated: simulatedPayPal() };
  return <AppShell active="Home" mobileFullBleed><DesktopHome {...homeData} activity={activity} now={now} showDemo={isPublicDemo() || homeData.simulated} recordedAi={recordedAi}/><MobileHome {...homeData} recent={mobileRecent}/></AppShell>;
}
