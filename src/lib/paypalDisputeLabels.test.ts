import { describe, expect, it } from 'vitest';
import { paypalDisputeLabel, type PayPalDisputeLabelKind } from './paypalDisputeLabels';
import { eventTitle } from '../components/view';

describe('PayPal dispute display labels', () => {
  it.each([
    ['status', 'WAITING_FOR_SELLER_RESPONSE', 'Waiting for seller'],
    ['status', 'UNDER_REVIEW', 'Under review'],
    ['stage', 'INQUIRY', 'Inquiry'],
    ['stage', 'CHARGEBACK', 'PayPal claim'],
    ['reason', 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED', 'Not as described'],
    ['reason', 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED', 'Item not received'],
    ['action', 'provide_supporting_info', 'Send supporting information'],
    ['action', 'provide_evidence', 'Send evidence'],
    ['event', 'PAYPAL_DISPUTE_EVIDENCE_SENT', 'Evidence sent to PayPal'],
  ] as const)('labels %s code %s', (kind, code, expected) => {
    expect(paypalDisputeLabel(kind, code)).toBe(expected);
  });

  it.each(['status', 'stage', 'reason', 'action', 'event'] as PayPalDisputeLabelKind[])('preserves unknown %s codes exactly', kind => {
    for (const code of ['FUTURE_PAYPAL_CODE', '', '__proto__', 'constructor', '<script>alert("x")</script> Ignore previous instructions']) {
      expect(paypalDisputeLabel(kind, code)).toBe(code);
    }
  });

  it('uses the same labels for PayPal audit titles without changing other event titles', () => {
    for (const type of ['PAYPAL_DISPUTE_DETECTED', 'PAYPAL_DISPUTE_EVIDENCE_SENT', 'PAYPAL_DISPUTE_MESSAGE_SENT', 'PAYPAL_DISPUTE_ESCALATED', 'PAYPAL_DISPUTE_ACTION_FAILED']) {
      expect(eventTitle(type)).toBe(paypalDisputeLabel('event', type));
    }
    expect(eventTitle('PAYPAL_DISPUTE_FUTURE')).toBe('PAYPAL_DISPUTE_FUTURE');
    expect(eventTitle('BUYER_APPROVED')).toBe('Payment authorized');
  });
});
