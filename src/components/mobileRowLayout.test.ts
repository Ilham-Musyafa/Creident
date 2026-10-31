import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MobileTransactionRow } from './MobileTransactionRow';
import { transactionRow } from './transactionsView';

describe('Compact mobile deal story', () => {
  it('shows item, category/date and status, keeps Demo visible and leaves the action on the deal page', () => {
    const row = transactionRow({ id: 'row', item: '[Demo] Camera', status: 'AUTHORIZED', captured: false, buyerId: 'buyer', sellerId: 'seller', amount: '20.00', currency: 'USD', termsJson: '{"category":"electronics-computers"}' }, 'seller', '2026-10-31T12:00:00Z', [], '2026-10-31T00:00:00Z');
    const html = renderToStaticMarkup(createElement(MobileTransactionRow, { row, compact: true }));
    expect(html).toContain('href="/deals/row"');
    expect(html.indexOf('Camera')).toBeLessThan(html.indexOf('Electronics &amp; Computers'));
    expect(html).toContain(' - 31 Oct 2026');
    expect(html).toContain(' · Demo');
    expect(html.indexOf('Electronics &amp; Computers')).toBeLessThan(html.indexOf('Payment approved'));
    expect(html).not.toContain('Add tracking');
    expect(html).not.toContain('desktop-status-equal');
  });
});
