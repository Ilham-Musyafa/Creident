import { describe, expect, it } from 'vitest';
import { groupTransactionRows, sortHomeRows, transactionRow } from './transactionsView';
import type { StoredTx } from '../lib/repository';
const now = '2026-10-31T12:00:00Z';
const make = (id: string, status: StoredTx['status'], updated: string, shipBy?: string) => transactionRow({ id, item: id, status, buyerId: 'buyer', sellerId: 'seller', captured: false, termsJson: '{}', amount: '20.00', currency: 'USD', shipBy }, 'seller', now, [], updated, updated);
describe('Pinned Transactions and Home ordering', () => {
  it('pins a last-month action above a completed deal from today, without duplicates', () => {
    const action = make('old-action', 'AUTHORIZED', '2026-09-02T12:00:00Z', '2026-10-31T15:00:00Z');
    const completed = make('done-today', 'COMPLETED', now);
    const groups = groupTransactionRows([completed, action], now);
    expect(groups.map(g => g.key)).toEqual(['action', 'today']);
    expect(groups[0]?.rows.map(r => r.id)).toEqual(['old-action']);
    expect(groups[1]?.rows.map(r => r.id)).toEqual(['done-today']);
    expect(new Set(groups.flatMap(g => g.rows.map(r => r.id))).size).toBe(2);
  });
  it('sorts pinned actions by nearest deadline, then newest; missing deadlines last', () => {
    const later = make('later', 'AUTHORIZED', now, '2026-11-01T12:00:00Z');
    const soon = make('soon', 'AUTHORIZED', '2026-09-01', '2026-10-31T14:00:00Z');
    const none = make('none', 'TERMS_LOCKED', now); none.needsAction = true;
    expect(groupTransactionRows([later, none, soon], now)[0]?.rows.map(r => r.id)).toEqual(['soon', 'later', 'none']);
  });
  it('uses UTC Monday week boundaries, keeps cancelled deals in their date group and hides empty groups', () => {
    const rows = [make('earlier', 'CANCELLED', '2026-10-25T23:59:59Z'), make('week', 'SHIPPED', '2026-10-26T00:00:00Z'), make('today', 'CANCELLED', '2026-10-31T00:00:00Z')];
    expect(groupTransactionRows(rows, now).map(g => [g.key, g.rows.map(r => r.id)])).toEqual([['today', ['today']], ['week', ['week']], ['earlier', ['earlier']]]);
    expect(groupTransactionRows([], now)).toEqual([]);
    expect(rows.map(r => r.id)).toEqual(['earlier', 'week', 'today']);
  });
  it('uses the latest recorded step over creation date and keeps unknown dates in Earlier', () => {
    const row = make('changed-today', 'COMPLETED', '2026-09-01'); row.updatedAt = now;
    const unknown = make('unknown', 'CANCELLED', 'invalid');
    expect(groupTransactionRows([unknown, row], now).map(g => [g.key, g.rows.map(r => r.id)])).toEqual([['today', ['changed-today']], ['earlier', ['unknown']]]);
  });
  it('keeps Home ungrouped, with actions then active then closed, newest within each', () => {
    const rows = [make('closed-new', 'CANCELLED', now), make('active', 'SHIPPED', '2026-10-30'), make('action-old', 'AUTHORIZED', '2026-09-01'), make('action-new', 'AUTHORIZED', '2026-10-01')];
    expect(sortHomeRows(rows).map(r => r.id)).toEqual(['action-new', 'action-old', 'active', 'closed-new']);
  });
});
