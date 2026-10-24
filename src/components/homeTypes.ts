import type { TransactionRow } from './transactionsView';
import type { Role } from './view';

export interface HomeData {
  role: Role; approvedAmount: string; approvedCount: number; active: number; inDispute: number; completed: number;
  actionCount: number; actionTitle: string; actions: TransactionRow[]; recent: TransactionRow[];
  recentTitle: string; verified: number; total: number; simulated: boolean;
}
