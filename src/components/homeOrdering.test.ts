import { describe, expect, it } from 'vitest';
import { sortHomeRows, transactionRow } from './transactionsView';
import type { StoredTx } from '../lib/repository';
const row = (id: string, status: StoredTx['status'], date: string) => transactionRow({ id, item: id, status, buyerId: 'buyer', sellerId: 'seller', captured: false, amount: '20.00', currency: 'USD', termsJson: '{}' }, 'seller', '2026-10-31T12:00:00Z', [], date);
describe('Home role-priority ordering', () => {
  it('puts old actions ahead of new active and closed deals, newest within each priority', () => {
    const rows = [row('closed', 'CANCELLED', '2026-10-31'), row('active-new', 'SHIPPED', '2026-10-31'), row('action-old', 'AUTHORIZED', '2026-09-01'), row('action-new', 'AUTHORIZED', '2026-10-01'), row('active-old', 'SHIPPED', '2026-10-01')];
    expect(sortHomeRows(rows).map(r => r.id)).toEqual(['action-new', 'action-old', 'active-new', 'active-old', 'closed']);
    expect(rows[0]?.id).toBe('closed');
  });
});
