import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { StoredDecision, StoredRecommendation, StoredTx } from '../lib/repository';
import type { AuditEvent } from '../lib/audit/chain';
import { DealDecisionSummary } from './DealDecisionSummary';
import { ActivityFeed } from './ActivityFeed';

const baseTx: StoredTx = { id: 'synthetic', status: 'VOIDED', captured: false, buyerId: 'buyer', sellerId: 'seller', item: '[Demo] Camera', amount: '64.00', currency: 'USD', termsJson: '{}' };
const decision: StoredDecision = { outcome: 'REFUND', reviewerId: 'reviewer', reason: 'Recorded human reason', createdAt: '2026-10-26T13:00:00Z' };
function render(tx: Partial<StoredTx>, choice: Partial<StoredDecision> = {}, recommendation: StoredRecommendation | null = null, events: AuditEvent[] = []) {
  return renderToStaticMarkup(createElement(DealDecisionSummary, { tx: { ...baseTx, ...tx }, decision: { ...decision, ...choice }, recommendation, events }));
}

describe('Deal story decision wording', () => {
  it('does not call a cancelled authorization a refund', () => {
    const html = render({ status: 'VOIDED' });
    expect(html).toContain('Payment cancelled');
    expect(html).not.toContain('Refund issued to the buyer');
    expect(html).toContain('/deals/synthetic/decision');
  });
  it('does not call a required-return decision an executed refund', () => {
    const html = render({ status: 'RETURN_REQUESTED' });
    expect(html).toContain('Refund after the item is returned');
    expect(html).not.toContain('Refund issued to the buyer');
  });
  it('keeps an unexecuted partial refund pending and uses the recorded amount', () => {
    const html = render({ status: 'COMPLETED', captured: true, partialRefundState: 'pending', partialRefundAmount: '12.00' }, { outcome: 'PARTIAL_REFUND', amount: '12.00' });
    expect(html).toContain('Partial refund pending');
    expect(html).toContain('$12.00');
    expect(html).not.toContain('Partial refund issued');
  });
  it('does not invent an amount when a historical decision lacks one', () => {
    const html = render({ status: 'PARTIALLY_REFUNDED', partialRefundState: 'completed' }, { outcome: 'PARTIAL_REFUND' });
    expect(html).toContain('Partial refund issued');
    expect(html).not.toContain('$0.00');
  });
  it('shows a later missed-return capture rather than the earlier refund choice', () => {
    const event: AuditEvent = { txId: 'synthetic', seq: 1, actor: 'system', type: 'RETURN_DEADLINE_PASSED', ts: decision.createdAt, payload: { effect: 'PAYPAL_CAPTURE' }, prevHash: '', hash: '' };
    expect(render({ status: 'COMPLETED', captured: true }, {}, null, [event])).toContain('Payment completed: item not returned in time');
  });
  it.each([
    ['REFUND', 'Yes'], ['RELEASE', 'No, see reason'], ['ESCALATE_HUMAN', 'A person decided, as the rules asked'],
  ] as const)('uses receipt agreement wording for recommendation %s', (action, label) => {
    const recommendation: StoredRecommendation = { txId: 'synthetic', ruleId: 'R5', action, reasons: [], requiresHuman: true, aiSummary: null, createdAt: decision.createdAt };
    expect(render({}, {}, recommendation)).toContain(label);
  });
});

describe('Deal story activity', () => {
  it('retains an accessible activity region and record link when no feed events exist', () => {
    const html = renderToStaticMarkup(createElement(ActivityFeed, { txId: 'synthetic', items: [], now: decision.createdAt }));
    expect(html).toContain('aria-label="Activity"');
    expect(html).toContain('No activity yet');
    expect(html).toContain('/audit/synthetic');
  });
});
