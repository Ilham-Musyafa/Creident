import { describe, expect, it } from 'vitest';
import type { StoredTx } from '../lib/repository';
import { itemIcon, transactionRow, sortTransactionRows, matchesTransactionFilter, searchTransactionRows, readTransactionFilter, transactionQuery } from './transactionsView';

const now = '2026-10-24T12:00:00Z';
const tx = (overrides: Partial<StoredTx> = {}): StoredTx => ({ id: 'test', status: 'DRAFT', captured: false, buyerId: 'buyer', sellerId: 'seller', item: 'Phone', amount: '120.00', currency: 'USD', termsJson: '{}', ...overrides });
describe('transaction list presentation', () => {
  it('offers acceptance only to a party who has not already accepted', () => {
    expect(transactionRow(tx(), 'buyer', now).needsAction).toBe(true);
    expect(transactionRow(tx(), 'buyer', now).href).toBe('/deals/test/checkout');
    expect(transactionRow(tx(), 'buyer', now, ['buyer']).needsAction).toBe(false);
    expect(transactionRow(tx(), 'seller', now, ['seller']).needsAction).toBe(false);
    expect(transactionRow(tx(), 'reviewer', now).needsAction).toBe(false);
  });
  it('reuses existing role actions and routes', () => {
    expect(transactionRow(tx({ status: 'AUTHORIZED' }), 'seller', now)).toMatchObject({ needsAction: true, nextStep: 'Add tracking', href: '/deals/test' });
    expect(transactionRow(tx({ status: 'AUTHORIZED' }), 'buyer', now)).toMatchObject({ needsAction: false, nextStep: 'Waiting for seller to ship' });
    expect(transactionRow(tx({ status: 'UNDER_REVIEW' }), 'reviewer', now).href).toBe('/deals/test/review');
    expect(transactionRow(tx({ status: 'UNDER_REVIEW' }), 'buyer', now).nextStep).toBe('Waiting for reviewer');
    expect(transactionRow(tx({ status: 'DISPUTED' }), 'buyer', now).href).toBe('/deals/test/evidence');
  });
  it('puts actions and nearest deadlines first without mutating the input order', () => {
    const late = transactionRow(tx({ id: 'late', status: 'AUTHORIZED', shipBy: '2026-10-26T12:00:00Z' }), 'seller', now);
    const soon = transactionRow(tx({ id: 'soon', status: 'DISPUTED', evidenceUntil: '2026-10-24T14:00:00Z' }), 'seller', now);
    const closed = transactionRow(tx({ id: 'closed', status: 'COMPLETED', captured: true }), 'seller', now);
    const waiting = transactionRow(tx({ id: 'waiting', status: 'SHIPPED' }), 'seller', now);
    const input = [closed, late, waiting, soon];
    expect(sortTransactionRows(input).map(row => row.id)).toEqual(['soon', 'late', 'waiting', 'closed']);
    expect(input.map(row => row.id)).toEqual(['closed', 'late', 'waiting', 'soon']);
  });
  it('shows overdue or relevant deadlines and ignores old final-state deadlines', () => {
    expect(transactionRow(tx({ status: 'DISPUTED', evidenceUntil: '2026-10-24T11:00:00Z' }), 'buyer', now).deadlineLabel).toBe('Deadline passed');
    expect(transactionRow(tx({ status: 'AUTHORIZED', shipBy: '2026-10-25T13:00:00Z' }), 'seller', now).deadlineLabel).toBe('1 day 1 hour left');
    expect(transactionRow(tx({ status: 'VOIDED', shipBy: '2026-10-01T12:00:00Z' }), 'buyer', now).deadline).toBeNull();
    expect(transactionRow(tx({ status: 'FROZEN_EXTERNAL', shipBy: '2026-10-01T12:00:00Z' }), 'buyer', now).deadline).toBeNull();
  });
  it('keeps demo labels while cleaning only the displayed prefix', () => {
    const original = tx({ item: '[Demo] Smartwatch', termsJson: '{"demo":true}' });
    expect(transactionRow(original, 'buyer', now)).toMatchObject({ title: 'Smartwatch', demo: true, icon: 'watch' });
    expect(original.item).toBe('[Demo] Smartwatch'); expect(original.termsJson).toBe('{"demo":true}');
    expect(transactionRow(tx({ item: 'My Demo Watch' }), 'buyer', now)).toMatchObject({ title: 'My Demo Watch', demo: false });
  });
  it('uses known categories and safe fallback icons for unknown values', () => {
    expect(itemIcon('camera', 'Watch')).toBe('camera');
    expect(itemIcon(undefined, 'Board game set')).toBe('game');
    expect(itemIcon(undefined, 'Desk lamp')).toBe('lamp');
    expect(itemIcon('<script>alert(1)</script>', 'Unknown item')).toBe('package');
  });
  it('validates query inputs and filters without inherited-key crashes', () => {
    expect(readTransactionFilter('review')).toBe('review');
    for (const input of ['__proto__', 'toString', ['action'], undefined]) expect(readTransactionFilter(input)).toBe('all');
    expect(transactionQuery('x'.repeat(300))).toHaveLength(200); expect(transactionQuery(['Phone'])).toBe('');
    const rows = [transactionRow(tx({ status: 'AUTHORIZED' }), 'seller', now), transactionRow(tx({ item: '<script>literal</script>', status: 'COMPLETED' }), 'seller', now)];
    expect(searchTransactionRows(rows, ' PHONE ')).toHaveLength(1);
    expect(rows.filter(row => matchesTransactionFilter(row, 'action'))).toHaveLength(1);
    expect(rows.filter(row => matchesTransactionFilter(row, 'closed'))).toHaveLength(1);
    expect(searchTransactionRows(rows, '<script>')[0]!.title).toBe('<script>literal</script>');
  });
  it('describes a pending refund without offering a retry or new money action', () => {
    expect(transactionRow(tx({ status: 'COMPLETED', captured: true, partialRefundState: 'pending' }), 'reviewer', now)).toMatchObject({ nextStep: 'Refund pending verification', needsAction: false, href: '/deals/test' });
  });
});
