import { paypalDisputeLabel } from '../lib/paypalDisputeLabels';
// Pure helpers that turn stored data into what the screens show. No React, no I/O.
import type { TxStatus } from '../lib/domain/types';

export type Role = 'buyer' | 'seller' | 'reviewer';
export const ROLES: readonly Role[] = ['buyer', 'seller', 'reviewer'];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function money(amount: string | number, currency = 'USD'): string {
  const value = typeof amount === 'number' ? amount : Number(amount);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

/** "1d 4h left", "3h 20m left" or null when the moment has passed. */
export function timeLeft(until: string | undefined, now: string): string | null {
  if (!until) return null;
  const ms = Date.parse(until) - Date.parse(now);
  if (!(ms > 0)) return null;
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes % 60}m left`;
  return `${Math.max(1, minutes)}m left`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC';
}

export function shortHash(hash: string | undefined, size = 4): string {
  if (!hash) return '—';
  return hash.length <= size * 2 + 1 ? hash : `${hash.slice(0, size)}…${hash.slice(-size)}`;
}

/** Statuses where PayPal has authorized funds that are not captured yet. */
export function isReserved(status: TxStatus, captured: boolean): boolean {
  return !captured && ['AUTHORIZED', 'SHIPPED', 'IN_INSPECTION', 'DISPUTED', 'UNDER_REVIEW', 'RETURN_REQUESTED', 'FROZEN_EXTERNAL'].includes(status);
}

export function isActive(status: TxStatus): boolean {
  return !['COMPLETED', 'REFUNDED', 'VOIDED', 'CANCELLED'].includes(status);
}

export type StepState = 'done' | 'current' | 'upcoming';
export interface Step { title: string; detail?: string; state: StepState }

/** The five-step progress shown on the deal detail screen. */
export function timelineFor(status: TxStatus, frozenFrom?: TxStatus): Step[] {
  const base: Array<Omit<Step, 'state'>> = [
    { title: 'Terms locked', detail: 'Both parties agreed to the same terms' },
    { title: 'Payment authorized', detail: 'Funds reserved via PayPal, not captured' },
    { title: 'Shipped', detail: 'Seller added tracking (simulated courier)' },
    { title: 'Buyer inspection', detail: 'Confirm receipt or open a dispute' },
    { title: 'Released to seller', detail: 'Captured via PayPal' },
  ];
  const effective = status === 'FROZEN_EXTERNAL' && frozenFrom ? frozenFrom : status;
  const doneUntil: Record<TxStatus, number> = {
    DRAFT: 0, CANCELLED: 0, TERMS_LOCKED: 1, AWAITING_APPROVAL: 1, AUTHORIZED: 2, VOIDED: 2,
    SHIPPED: 2, IN_INSPECTION: 3, DISPUTED: 3, UNDER_REVIEW: 3, RETURN_REQUESTED: 4, FROZEN_EXTERNAL: 3,
    COMPLETED: 5, REFUNDED: 5,
  };
  const done = doneUntil[effective];
  const steps: Step[] = base.map((step, i) => ({ ...step, state: i < done ? 'done' : i === done ? 'current' : 'upcoming' }));

  const current = steps[done];
  if (effective === 'AWAITING_APPROVAL' && current) current.detail = 'Waiting for the buyer to approve on PayPal (Sandbox)';
  if (effective === 'SHIPPED' && current) { current.detail = 'In transit (simulated courier)'; }
  if ((effective === 'DISPUTED' || effective === 'UNDER_REVIEW') && steps[3]) {
    steps[3] = { title: effective === 'DISPUTED' ? 'Dispute open' : 'Under review', detail: effective === 'DISPUTED' ? 'Both sides add evidence' : 'Rules and a human reviewer decide', state: 'current' };
  }
  if (effective === 'RETURN_REQUESTED' && steps[3] && steps[4]) {
    steps[3] = { title: 'Refund decided', detail: 'A reviewer decided to refund once the item is returned', state: 'done' };
    steps[4] = { title: 'Return to seller', detail: 'Buyer ships the item back; the refund runs when it arrives', state: 'current' };
  }
  if (status === 'FROZEN_EXTERNAL' && steps[Math.min(done, 4)]) {
    steps[Math.min(done, 4)] = { title: 'Frozen by PayPal', detail: 'A PayPal dispute or reversal is open; nothing moves', state: 'current' };
  }
  if (effective === 'VOIDED') steps.splice(2, 3, { title: 'Authorization voided', detail: 'No money was taken', state: 'done' });
  if (effective === 'CANCELLED') steps.splice(0, 5, { title: 'Cancelled', detail: 'Cancelled before payment', state: 'done' });
  if (effective === 'REFUNDED' && steps[4]) steps[4] = { title: 'Refunded to buyer', detail: 'Captured, then refunded via PayPal', state: 'done' };
  return steps;
}

const EVENT_TITLES: Record<string, string> = {
  TRANSACTION_CREATED: 'Terms created',
  TERMS_ACCEPTED: 'Terms accepted',
  ACCEPT_TERMS: 'Terms locked',
  START_PAYMENT: 'PayPal order created',
  BUYER_APPROVED: 'Payment authorized',
  SUBMIT_TRACKING: 'Tracking submitted',
  TRACKING_DELIVERED: 'Delivery recorded',
  TRACKING_INVALID: 'Tracking invalid',
  BUYER_CONFIRM: 'Buyer confirmed, payment captured',
  INSPECTION_EXPIRED: 'Inspection ended, payment captured',
  OPEN_DISPUTE: 'Dispute opened',
  EVIDENCE_SUBMITTED: 'Evidence added',
  EVIDENCE_TRANSLATED: 'AI evidence translation (original authoritative)',
  EVIDENCE_COMPLETE: 'Evidence complete',
  EVIDENCE_CHECK_RUN: 'AI evidence completeness checked (advisory)',
  RECOMMENDATION_RECORDED: 'Rule recommendation recorded',
  DECISION: 'Reviewer decision',
  HUMAN_SPLIT_PENDING: 'Split decision (pending)',
  SHIP_DEADLINE_PASSED: 'Ship-by deadline missed, authorization voided',
  EXTERNAL_DISPUTE: 'Frozen by a PayPal dispute',
  EXTERNAL_RESOLVED: 'PayPal dispute resolved',
  PAYPAL_WEBHOOK: 'PayPal webhook received',
  PAYPAL_ERROR: 'PayPal error',
  PAYPAL_TRACKING_ADDED: 'Tracking sent to PayPal',
  PAYPAL_TRACKING_FAILED: 'Sending tracking to PayPal failed',
  CANCEL: 'Cancelled',
  RETURN_DELIVERED: 'Return delivered to seller, refund issued',
  RETURN_DEADLINE_PASSED: 'Item not returned in time, payment released',
  AI_DRAFT_CREATED: 'AI draft prepared (not sent)',
  COURIER_CLAIM_PACK_CREATED: 'Courier claim pack created',
};

export function eventTitle(type: string): string {
  if (type.startsWith('PAYPAL_DISPUTE_')) return paypalDisputeLabel('event', type);
  return EVENT_TITLES[type] ?? type.toLowerCase().replace(/_/g, ' ');
}

/** What the current role can do next on a deal, used to pick the screen's main action. */
export type NextAction =
  | 'accept-terms' | 'pay' | 'wait-approval' | 'ship' | 'confirm-or-dispute'
  | 'add-evidence' | 'review' | 'ship-return' | 'none';

export function nextAction(status: TxStatus, role: Role): NextAction {
  switch (status) {
    case 'DRAFT': return role === 'reviewer' ? 'none' : 'accept-terms';
    case 'TERMS_LOCKED': return role === 'buyer' ? 'pay' : 'none';
    case 'AWAITING_APPROVAL': return role === 'buyer' ? 'wait-approval' : 'none';
    case 'AUTHORIZED': return role === 'seller' ? 'ship' : 'none';
    case 'IN_INSPECTION': return role === 'buyer' ? 'confirm-or-dispute' : 'none';
    case 'DISPUTED': return role === 'reviewer' ? 'none' : 'add-evidence';
    case 'UNDER_REVIEW': return role === 'reviewer' ? 'review' : 'none';
    case 'RETURN_REQUESTED': return role === 'buyer' ? 'ship-return' : 'none';
    default: return 'none';
  }
}

/** One-time code the evidence photos must show. Derived from the deal id. */
export function evidenceCode(txId: string): string {
  const compact = txId.replace(/-/g, '').toUpperCase();
  return `HV-${compact.slice(0, 4)} · ${compact.slice(-4)}`;
}

/** Money steps of this deal ran against the demo stub or the simulated PayPal, not the Sandbox. */
export function isSimulatedDeal(tx: { paypalOrderId?: string | null }): boolean {
  return /^(SIM|DEMO)-/.test(tx.paypalOrderId ?? '');
}

const DAY = 86_400_000;

/**
 * PayPal honours an authorization for 3 days; after that a capture usually still works until
 * day 29 but is not guaranteed (docs/DESIGN.md section 3).
 */
export function authorizationWindow(authorizedAt: string, now: string): { honorEndsAt: string; expiresAt: string; phase: 'honor' | 'after-honor' | 'expired' } {
  const start = Date.parse(authorizedAt);
  const honorEndsAt = new Date(start + 3 * DAY).toISOString();
  const expiresAt = new Date(start + 29 * DAY).toISOString();
  const t = Date.parse(now);
  return { honorEndsAt, expiresAt, phase: t < start + 3 * DAY ? 'honor' : t < start + 29 * DAY ? 'after-honor' : 'expired' };
}
