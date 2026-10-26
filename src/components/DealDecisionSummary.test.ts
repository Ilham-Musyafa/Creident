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
    expect(html).toContain('Refund decision recorded · awaiting return');
    expect(html).not.toContain('Refund issued to the buyer');
  });
  it('keeps an unexecuted partial refund pending and uses the recorded amount', () => {
    const html = render({ status: 'COMPLETED', captured: true, partialRefundState: 'pending', partialRefundAmount: '12.00' }, { outcome: 'PARTIAL_REFUND', amount: '12.00' });
    expect(html).toContain('Partial refund decision recorded · payment step pending');
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
    expect(render({ status: 'COMPLETED', captured: true }, {}, null, [event])).toContain('Payment charged · return deadline passed');
  });
  it('claims a charge only when the transaction records successful capture', () => {
    expect(render({ status: 'COMPLETED', captured: true }, { outcome: 'RELEASE' })).toContain('>Payment charged</p>');
  });
  it.each(['failed', 'pending'] as const)('keeps RELEASE neutral when capture is %s', state => {
    const events: AuditEvent[] = state === 'failed' ? [{ txId: 'synthetic', seq: 1, actor: 'system', type: 'PAYPAL_ERROR', ts: decision.createdAt, payload: { effect: 'PAYPAL_CAPTURE' }, prevHash: '', hash: '' }] : [];
    const html = render({ status: 'UNDER_REVIEW', captured: false }, { outcome: 'RELEASE' }, null, events);
    expect(html).toContain('Decision recorded · payment step pending');
    expect(html).not.toContain('Payment charged');
  });
  it.each([
    { status: 'REFUNDED' as const, captured: true },
    { status: 'FROZEN_EXTERNAL' as const, captured: true, frozenFrom: 'REFUNDED' as const },
  ])('recognizes a completed refund recorded in $status', tx => {
    expect(render(tx)).toContain('>Refund issued to the buyer</p>');
  });
  it('does not mistake capture, a refund choice or a requested effect for a successful refund', () => {
    const event: AuditEvent = { txId: 'synthetic', seq: 1, actor: 'reviewer', type: 'DECISION', ts: decision.createdAt, payload: { effect: 'PAYPAL_REFUND' }, prevHash: '', hash: '' };
    const html = render({ status: 'UNDER_REVIEW', captured: true }, {}, null, [event]);
    expect(html).toContain('Decision recorded · payment step pending');
    expect(html).not.toContain('Refund issued');
  });
  it('formats a recorded partial amount with the deal currency and omits unsupported fee claims', () => {
    // Presentation compatibility only: the create API still supports USD only.
    const html = render({ status: 'PARTIALLY_REFUNDED', captured: true, partialRefundState: 'completed', currency: 'EUR' }, { outcome: 'PARTIAL_REFUND', amount: '12.00' });
    expect(html).toContain('Partial refund issued: €12.00');
    expect(html).toContain('Reviewer refund amount: €12.00 EUR');
    expect(html).not.toContain('USD');
    expect(html).not.toContain('fee borne');
    expect(html).not.toContain('Platform');
  });
  it('uses a stored partial amount when the human decision lacks its amount field', () => {
    const html = render({ status: 'COMPLETED', captured: true, partialRefundState: 'pending', partialRefundAmount: '12.00' }, { outcome: 'PARTIAL_REFUND' });
    expect(html).toContain('Reviewer refund amount: $12.00 USD');
    expect(html).not.toContain('Partial refund issued');
  });
  it.each([
    { status: 'PARTIALLY_REFUNDED' as const, captured: true },
    { status: 'FROZEN_EXTERNAL' as const, captured: true, frozenFrom: 'PARTIALLY_REFUNDED' as const },
  ])('recognizes a completed partial refund without requiring newer optional metadata: $status', tx => {
    expect(render(tx, { outcome: 'PARTIAL_REFUND', amount: '12.00' })).toContain('Partial refund issued: $12.00');
  });
  it('does not claim no money ever moved for a pending split after capture', () => {
    const html = render({ status: 'UNDER_REVIEW', captured: true }, { outcome: 'SPLIT' });
    expect(html).toContain('Split decision recorded · payment step pending');
    expect(html).not.toContain('no money moved');
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
