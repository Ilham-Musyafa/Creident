// Display labels only. Unknown PayPal values stay intact; never interpret them as markup.
const LABELS = {
  status: {
    OPEN: 'Open',
    WAITING_FOR_BUYER_RESPONSE: 'Waiting for buyer',
    WAITING_FOR_SELLER_RESPONSE: 'Waiting for seller',
    UNDER_REVIEW: 'Under review',
    RESOLVED: 'Resolved',
    OTHER: 'Other status',
  },
  stage: {
    INQUIRY: 'Inquiry',
    CHARGEBACK: 'PayPal claim',
    PRE_ARBITRATION: 'Before arbitration',
    ARBITRATION: 'Arbitration',
  },
  reason: {
    MERCHANDISE_OR_SERVICE_NOT_RECEIVED: 'Item not received',
    MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED: 'Not as described',
    UNAUTHORISED: 'Unauthorized payment',
    UNAUTHORIZED: 'Unauthorized payment',
    CREDIT_NOT_PROCESSED: 'Refund not received',
    DUPLICATE_TRANSACTION: 'Duplicate payment',
    INCORRECT_AMOUNT: 'Incorrect amount',
    PAYMENT_BY_OTHER_MEANS: 'Paid another way',
    CANCELED_RECURRING_BILLING: 'Recurring payment canceled',
    PROBLEM_WITH_REMITTANCE: 'Payment transfer problem',
    OTHER: 'Other reason',
  },
  action: {
    provide_evidence: 'Send evidence',
    provide_supporting_info: 'Send supporting information',
    send_message: 'Send message',
    escalate: 'Escalate to claim',
    accept_claim: 'Accept claim',
    make_offer: 'Make offer',
    accept_offer: 'Accept offer',
    acknowledge_return_item: 'Acknowledge returned item',
    appeal: 'Appeal',
    // Local bridge actions can appear in failure audit events.
    sync: 'Check disputes',
    refresh: 'Refresh case',
  },
  event: {
    PAYPAL_DISPUTE_DETECTED: 'PayPal dispute detected',
    PAYPAL_DISPUTE_EVIDENCE_SENT: 'Evidence sent to PayPal',
    PAYPAL_DISPUTE_MESSAGE_SENT: 'Message sent to PayPal',
    PAYPAL_DISPUTE_ESCALATED: 'Escalated to PayPal claim',
    PAYPAL_DISPUTE_ACTION_FAILED: 'PayPal dispute action failed',
  },
} as const;

export type PayPalDisputeLabelKind = keyof typeof LABELS;

export function paypalDisputeLabel(kind: PayPalDisputeLabelKind, code: string): string {
  const labels: Readonly<Record<string, string>> = LABELS[kind];
  return Object.hasOwn(labels, code) ? labels[code]! : code;
}
