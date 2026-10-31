import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MobileTransactionRow } from './MobileTransactionRow';
import { describe, expect, it } from 'vitest';
import { deadlineCue } from './deadlineCue';
import { transactionRow } from './transactionsView';
import type { StoredTx } from '../lib/repository';

const now = '2026-10-31T10:00:00.000Z';
const hour = 3600000;
const cueAt = (remaining: number, overrides: Partial<Parameters<typeof deadlineCue>[0]> = {}) => deadlineCue({
  deadline: Date.parse(now) + remaining, now, status: 'DISPUTED', needsAction: true, timeLeftLabel: '5 hours left', ...overrides,
});

describe('calm deadline cue', () => {
  it.each([24 * hour + 1, 24 * hour, 48 * hour])('stays absent at or above 24h: %s', remaining => {
    expect(cueAt(remaining)).toBeNull();
  });
  it.each([24 * hour - 1, 6 * hour + 1, 6 * hour])('uses the normal cue under 24h, including exactly 6h: %s', remaining => {
    expect(cueAt(remaining)).toEqual({ label: 'Due soon', strength: 'normal', accessibleLabel: 'Due soon, 5 hours left' });
  });
  it.each([6 * hour - 1, hour, 1])('strengthens the same cue strictly below 6h: %s', remaining => {
    expect(cueAt(remaining)).toEqual({ label: 'Due soon', strength: 'strong', accessibleLabel: 'Due soon, 5 hours left' });
  });
  it.each([0, -1, -hour])('does not call an expired deadline soon: %s', remaining => {
    expect(cueAt(remaining)).toBeNull();
  });
  it.each(['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'VOIDED', 'CANCELLED'] as const)('ignores closed %s even if action metadata is inconsistent', status => {
    expect(cueAt(hour, { status })).toBeNull();
  });
  it('does not nudge a waiting role', () => {
    expect(cueAt(hour, { needsAction: false })).toBeNull();
  });
  it.each([{ deadline: null }, { deadline: NaN }, { deadline: Infinity }, { now: 'not a date' }, { timeLeftLabel: null }])('ignores missing/invalid time: %j', overrides => {
    expect(cueAt(hour, overrides)).toBeNull();
  });
  it('keeps the complete existing time-left label for assistive technology', () => {
    expect(cueAt(5 * hour, { timeLeftLabel: '5 hours 12 minutes left' })?.accessibleLabel).toBe('Due soon, 5 hours 12 minutes left');
  });
});

const tx = (overrides: Partial<StoredTx> = {}): StoredTx => ({ id: 'deadline-demo', item: 'Phone', amount: '12.00', currency: 'USD', buyerId: 'buyer', sellerId: 'seller', termsJson: '{}', captured: false, status: 'AUTHORIZED', shipBy: new Date(Date.parse(now) + 5 * hour).toISOString(), ...overrides });
describe('deadline cues follow existing role actions', () => {
  it('nudges the seller to ship but leaves the waiting buyer alone', () => {
    expect(transactionRow(tx(), 'seller', now).deadlineCue?.strength).toBe('strong');
    expect(transactionRow(tx(), 'buyer', now).deadlineCue).toBeNull();
  });
  it('nudges the buyer for inspection or return, but not the seller', () => {
    for (const status of ['IN_INSPECTION', 'RETURN_REQUESTED'] as const) {
      const deal = tx({ status, inspectionUntil: new Date(Date.parse(now) + 12 * hour).toISOString(), returnBy: new Date(Date.parse(now) + 12 * hour).toISOString() });
      expect(transactionRow(deal, 'buyer', now).deadlineCue?.strength).toBe('normal');
      expect(transactionRow(deal, 'seller', now).deadlineCue).toBeNull();
    }
  });
  it('uses the shared evidence deadline for the two parties, not the reviewer', () => {
    const deal = tx({ status: 'DISPUTED', evidenceUntil: new Date(Date.parse(now) + 5 * hour).toISOString() });
    for (const role of ['seller', 'buyer'] as const) expect(transactionRow(deal, role, now).deadlineCue?.strength).toBe('strong');
    expect(transactionRow(deal, 'reviewer', now).deadlineCue).toBeNull();
  });
  it('ignores frozen and closed deals, preserving existing deadline text', () => {
    expect(transactionRow(tx({ status: 'FROZEN_EXTERNAL' }), 'seller', now).deadlineCue).toBeNull();
    expect(transactionRow(tx({ status: 'COMPLETED' }), 'buyer', now).deadlineCue).toBeNull();
    const row = transactionRow(tx({ shipBy: new Date(Date.parse(now) - hour).toISOString() }), 'seller', now);
    expect(row.deadlineLabel).toBe('Deadline passed'); expect(row.deadlineCue).toBeNull();
  });
});


describe('deadline cue in mobile row variants', () => {
  it.each([true, false])('keeps the cue and full accessible time in compact=%s rows', compact => {
    const sellerRow = transactionRow(tx(), 'seller', now);
    const html = renderToStaticMarkup(createElement(MobileTransactionRow, { row: sellerRow, compact }));
    expect(html).toContain('data-deadline-cue="strong"');
    expect(html).toContain('aria-label="Due soon, 5 hours 0 minutes left"');
    const waiting = renderToStaticMarkup(createElement(MobileTransactionRow, { row: transactionRow(tx(), 'buyer', now), compact }));
    expect(waiting).not.toContain('data-deadline-cue');
  });
});
