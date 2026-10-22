// Core domain types for a Creident transaction.
// See docs/DESIGN.md section 4 for the state machine this models.

export type TxStatus =
  | 'DRAFT'
  | 'TERMS_LOCKED'
  | 'AWAITING_APPROVAL'
  | 'AUTHORIZED'
  | 'SHIPPED'
  | 'IN_INSPECTION'
  | 'DISPUTED'
  | 'UNDER_REVIEW'
  | 'RETURN_REQUESTED'
  | 'FROZEN_EXTERNAL'
  | 'COMPLETED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'VOIDED'
  | 'CANCELLED';

export const FINAL_STATUSES: readonly TxStatus[] = ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'VOIDED', 'CANCELLED'];

export function isFinal(status: TxStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

/** The parts of a transaction the state machine needs. Timestamps are ISO-8601 strings. */
export interface Tx {
  id: string;
  status: TxStatus;
  /** True once the PayPal authorization has been captured. After that only a refund can undo it. */
  captured: boolean;
  amount?: string;
  partialRefundAmount?: string;
  partialRefundState?: 'awaiting_return' | 'ready' | 'pending' | 'completed' | 'cancelled';
  /** Status before an external PayPal dispute froze the transaction. */
  frozenFrom?: TxStatus;
  /** Seller must submit tracking before this moment. */
  shipBy?: string;
  /** Buyer may open a dispute until this moment. */
  inspectionUntil?: string;
  /** After a refund decision that requires a return: buyer must ship the item back before this moment. */
  returnBy?: string;
}

export type DecisionOutcome = 'RELEASE' | 'REFUND' | 'PARTIAL_REFUND';

/** Events that can move a transaction. Facts the guards need travel with the trigger. */
export type Trigger =
  | { type: 'ACCEPT_TERMS'; bothAccepted: boolean }
  | { type: 'START_PAYMENT' }
  | { type: 'BUYER_APPROVED'; orderApproved: boolean }
  | { type: 'SHIP_DEADLINE_PASSED'; now: string }
  | { type: 'SUBMIT_TRACKING'; now: string }
  | { type: 'TRACKING_DELIVERED'; destinationMatches: boolean }
  | { type: 'TRACKING_INVALID' }
  | { type: 'BUYER_CONFIRM'; externalDisputeOpen: boolean }
  | { type: 'INSPECTION_EXPIRED'; now: string; externalDisputeOpen: boolean }
  | { type: 'OPEN_DISPUTE'; now: string }
  | { type: 'EVIDENCE_COMPLETE' }
  /** A REFUND with requireReturn waits for the item to come back before any money moves. */
  | { type: 'DECISION'; outcome: DecisionOutcome; amount?: string; requireReturn?: boolean }
  | { type: 'RETURN_DELIVERED'; now: string; destinationMatches: boolean }
  | { type: 'RETURN_DEADLINE_PASSED'; now: string }
  | { type: 'EXTERNAL_DISPUTE' }
  | { type: 'EXTERNAL_RESOLVED' }
  | { type: 'CANCEL' };

/**
 * PayPal action that must succeed before the transition is committed.
 * The caller performs it (with an idempotency key) and only then saves the new state.
 */
export type Effect =
  | { kind: 'NONE' }
  | { kind: 'PAYPAL_CREATE_ORDER' }
  | { kind: 'PAYPAL_AUTHORIZE' }
  | { kind: 'PAYPAL_CAPTURE' }
  | { kind: 'PAYPAL_VOID' }
  | { kind: 'PAYPAL_REFUND' }
  | { kind: 'PAYPAL_PARTIAL_REFUND' };

export type TransitionResult =
  | { ok: true; tx: Tx; effect: Effect }
  | { ok: false; code: string; message: string };
