import { AppShell, PageHeader } from '../../components/layout';
import { TransactionsBrowser } from '../../components/TransactionsBrowser';
import { readTransactionFilter, transactionQuery, transactionRow } from '../../components/transactionsView';
import { data, getRole } from '../_server';

export const dynamic = 'force-dynamic';

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ filter?: string | string[]; q?: string | string[] }> }) {
  const role = await getRole();
  const params = await searchParams;
  const ctx = data();
  const now = ctx.now();
  const rows = ctx.repo.listTransactions().map(tx => transactionRow(tx, role, now, tx.status === 'DRAFT' ? ctx.repo.listAcceptances(tx.id) : []));
  return (
    <AppShell active="Deals" mobileFullBleed>
      <div className="hidden lg:block"><PageHeader title="Transactions" subtitle={`Viewing as demo ${role} · Open a row for its next step or details.`}/></div>
      <TransactionsBrowser key={role} role={role} rows={rows} initialFilter={readTransactionFilter(params.filter)} initialQuery={transactionQuery(params.q)}/>
    </AppShell>
  );
}
