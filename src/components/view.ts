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
  return !captured && ['AUTHORIZED', 'SHIPPED', 'IN_INSPECTION', 'DISPUTED', 'UNDER_REVIEW', 'FROZEN_EXTERNAL'].includes(status);
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
    SHIPPED: 2, IN_INSPECTION: 3, DISPUTED: 3, UNDER_REVIEW: 3, FROZEN_EXTERNAL: 3,
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
  EVIDENCE_COMPLETE: 'Evidence complete',
  RECOMMENDATION_RECORDED: 'Rule recommendation recorded',
  DECISION: 'Reviewer decision',
  HUMAN_SPLIT_PENDING: 'Split decision (pending)',
  SHIP_DEADLINE_PASSED: 'Ship-by deadline missed, authorization voided',
  EXTERNAL_DISPUTE: 'Frozen by a PayPal dispute',
  EXTERNAL_RESOLVED: 'PayPal dispute resolved',
  PAYPAL_WEBHOOK: 'PayPal webhook received',
  PAYPAL_ERROR: 'PayPal error',
  CANCEL: 'Cancelled',
};

export function eventTitle(type: string): string {
  return EVENT_TITLES[type] ?? type.toLowerCase().replace(/_/g, ' ');
}

/** What the current role can do next on a deal, used to pick the screen's main action. */
export type NextAction =
  | 'accept-terms' | 'pay' | 'wait-approval' | 'ship' | 'confirm-or-dispute'
  | 'add-evidence' | 'review' | 'none';

export function nextAction(status: TxStatus, role: Role): NextAction {
  switch (status) {
    case 'DRAFT': return role === 'reviewer' ? 'none' : 'accept-terms';
    case 'TERMS_LOCKED': return role === 'buyer' ? 'pay' : 'none';
    case 'AWAITING_APPROVAL': return role === 'buyer' ? 'wait-approval' : 'none';
    case 'AUTHORIZED': return role === 'seller' ? 'ship' : 'none';
    case 'IN_INSPECTION': return role === 'buyer' ? 'confirm-or-dispute' : 'none';
    case 'DISPUTED': return role === 'reviewer' ? 'none' : 'add-evidence';
    case 'UNDER_REVIEW': return role === 'reviewer' ? 'review' : 'none';
    default: return 'none';
  }
}

/** One-time code the evidence photos must show. Derived from the deal id. */
export function evidenceCode(txId: string): string {
  const compact = txId.replace(/-/g, '').toUpperCase();
  return `HV-${compact.slice(0, 4)} · ${compact.slice(-4)}`;
}
