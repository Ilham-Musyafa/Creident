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
  return !['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'VOIDED', 'CANCELLED'].includes(status);
}

export type StepState = 'done' | 'current' | 'upcoming';
export interface Step { title: string; detail?: string; state: StepState }

/** The five-step progress shown on the deal detail screen. */
export function timelineFor(status: TxStatus, frozenFrom?: TxStatus): Step[] {
  const base: Array<Omit<Step, 'state'>> = [
    { title: 'Agreed', detail: 'Both sides accepted the same terms' },
    { title: "Payment approved — not charged yet", detail: 'Charged after confirmation, the inspection deadline, or a reviewer decision' },
    { title: 'Shipped', detail: 'Seller added tracking (demo courier)' },
    { title: 'Buyer checks the item', detail: 'Confirm it arrived as agreed, or report a problem' },
    { title: 'Payment charged', detail: 'Payment charged; seller payout is not part of this demo' },
  ];
  const effective = status === 'FROZEN_EXTERNAL' && frozenFrom ? frozenFrom : status;
  const doneUntil: Record<TxStatus, number> = {
    DRAFT: 0, CANCELLED: 0, TERMS_LOCKED: 1, AWAITING_APPROVAL: 1, AUTHORIZED: 2, VOIDED: 2,
    SHIPPED: 2, IN_INSPECTION: 3, DISPUTED: 3, UNDER_REVIEW: 3, RETURN_REQUESTED: 4, FROZEN_EXTERNAL: 3,
    COMPLETED: 5, REFUNDED: 5, PARTIALLY_REFUNDED: 5,
  };
  const done = doneUntil[effective];
  const steps: Step[] = base.map((step, i) => ({ ...step, state: i < done ? 'done' : i === done ? 'current' : 'upcoming' }));

  const current = steps[done];
  if (effective === 'AWAITING_APPROVAL' && current) current.detail = 'Waiting for the buyer to approve on PayPal';
  if (effective === 'SHIPPED' && current) { current.detail = 'On the way (demo courier)'; }
  if ((effective === 'DISPUTED' || effective === 'UNDER_REVIEW') && steps[3]) {
    steps[3] = { title: effective === 'DISPUTED' ? 'Problem reported' : 'Being reviewed', detail: effective === 'DISPUTED' ? 'Both sides add evidence' : 'A person decides, guided by the rules', state: 'current' };
  }
  if (effective === 'RETURN_REQUESTED' && steps[3] && steps[4]) {
    steps[3] = { title: 'Refund approved', detail: 'The refund follows once the item is returned', state: 'done' };
    steps[4] = { title: 'Return to seller', detail: 'Buyer ships it back; the refund is sent when it arrives', state: 'current' };
  }
  if (status === 'FROZEN_EXTERNAL' && steps[Math.min(done, 4)]) {
    steps[Math.min(done, 4)] = { title: 'On hold · PayPal dispute', detail: 'PayPal is reviewing a case; nothing moves meanwhile', state: 'current' };
  }
  if (effective === 'VOIDED') steps.splice(2, 3, { title: 'Payment cancelled', detail: 'Nothing was charged', state: 'done' });
  if (effective === 'CANCELLED') steps.splice(0, 5, { title: 'Cancelled', detail: 'Cancelled before payment', state: 'done' });
  if (effective === 'PARTIALLY_REFUNDED' && steps[4]) steps[4] = { title: "Part of the money returned", detail: 'Charged, then part was refunded to the buyer', state: 'done' };
  if (effective === 'REFUNDED' && steps[4]) steps[4] = { title: 'Refund issued', detail: 'Charged, then refunded to the buyer', state: 'done' };
  return steps;
}

const EVENT_TITLES: Record<string, string> = {
  TRANSACTION_CREATED: 'Deal created',
  TERMS_ACCEPTED: 'Terms accepted',
  ACCEPT_TERMS: 'Terms agreed by both sides',
  START_PAYMENT: 'Payment started',
  BUYER_APPROVED: 'Payment approved',
  SUBMIT_TRACKING: 'Item shipped',
  TRACKING_DELIVERED: 'Item delivered',
  TRACKING_INVALID: 'Tracking number not valid',
  BUYER_CONFIRM: 'Buyer confirmed · payment completed',
  INSPECTION_EXPIRED: 'Check period ended · payment completed',
  OPEN_DISPUTE: 'Problem reported',
  EVIDENCE_SUBMITTED: 'Evidence added',
  EVIDENCE_TRANSLATED: 'Evidence translated by AI (original kept)',
  EVIDENCE_COMPLETE: 'Evidence complete',
  EVIDENCE_CHECK_RUN: 'AI checked for missing evidence',
  RECOMMENDATION_RECORDED: 'Rules recommendation saved',
  DECISION: 'Reviewer decision',
  PARTIAL_REFUND_CAPTURED: "Payment charged before returning part of the money",
  PARTIAL_REFUND_COMPLETED: "Part of the money returned",
  HUMAN_SPLIT_PENDING: 'Split decision (pending)',
  SHIP_DEADLINE_PASSED: 'Not shipped in time · payment cancelled',
  EXTERNAL_DISPUTE: 'PayPal case opened · deal on hold',
  EXTERNAL_RESOLVED: 'PayPal case closed',
  PAYPAL_WEBHOOK: 'Update from PayPal',
  PAYPAL_ERROR: 'PayPal problem (needs checking)',
  PAYPAL_TRACKING_ADDED: 'Tracking shared with PayPal',
  PAYPAL_TRACKING_FAILED: 'Could not share tracking with PayPal',
  CANCEL: 'Deal cancelled',
  RETURN_DELIVERED: 'Return received by the seller',
  RETURN_DEADLINE_PASSED: 'Not returned in time · payment completed',
  AI_DRAFT_CREATED: 'AI draft prepared (not sent)',
  COURIER_CLAIM_PACK_CREATED: 'Courier claim prepared',
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
  return `CR-${compact.slice(0, 4)} · ${compact.slice(-4)}`;
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

/** Label for a one-time success animation when the deal reached this state in the last two minutes. */
export function recentSuccess(status: TxStatus, lastEventTs: string | undefined, now: string): string | null {
  if (!lastEventTs || Date.parse(now) - Date.parse(lastEventTs) > 120_000) return null;
  const labels: Partial<Record<TxStatus, string>> = {
    AUTHORIZED: 'Payment approved', COMPLETED: 'Deal completed', REFUNDED: 'Refund issued',
    PARTIALLY_REFUNDED: "Part of the money returned", RETURN_REQUESTED: 'Decision recorded', VOIDED: 'Payment cancelled',
  };
  return labels[status] ?? null;
}

export type ActivityKind = 'money' | 'ship' | 'dispute' | 'done' | 'info';
export interface ActivityItem { seq: number; text: string; kind: ActivityKind; ts: string }

const actorName = (actor: string) => actor === 'buyer' ? 'Buyer' : actor === 'seller' ? 'Seller' : actor === 'reviewer' ? 'Reviewer' : actor === 'paypal' ? 'PayPal' : 'System';
const DECISION_TEXT: Record<string, string> = { RELEASE: 'charge the buyer', REFUND: 'refund the buyer', PARTIAL_REFUND: "part of the money back", SPLIT: 'split (pending)' };
// Technical events stay in the audit log; the feed tells the story in plain words.
const HIDDEN_IN_FEED = new Set(['PAYPAL_WEBHOOK', 'AI_DRAFT_CREATED', 'EVIDENCE_CHECK_RUN', 'EVIDENCE_TRANSLATED', 'PAYPAL_DISPUTE_ACTION_FAILED', 'PARTIAL_REFUND_CAPTURED']);

/** Plain-language activity for the deal page (newest first); the audit log keeps every detail. */
export function activityFeed(events: Array<{ seq: number; type: string; actor: string; ts: string; payload: Record<string, unknown> }>, limit = 6): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const e of [...events].reverse()) {
    if (HIDDEN_IN_FEED.has(e.type)) continue;
    const who = actorName(e.actor);
    const [text, kind]: [string, ActivityKind] = ({
      TRANSACTION_CREATED: ['Seller created the deal', 'info'],
      TERMS_ACCEPTED: [`${who} accepted the terms`, 'done'],
      ACCEPT_TERMS: ['Terms locked for both sides', 'done'],
      START_PAYMENT: ['Buyer started the payment', 'money'],
      BUYER_APPROVED: ["Payment approved — not charged yet", 'money'],
      SUBMIT_TRACKING: ['Seller shipped the item', 'ship'],
      TRACKING_DELIVERED: ['Courier delivered the parcel', 'ship'],
      TRACKING_INVALID: ['Tracking could not be verified', 'dispute'],
      PAYPAL_TRACKING_ADDED: ['Tracking shared with PayPal', 'ship'],
      BUYER_CONFIRM: ['Buyer confirmed · payment completed', 'money'],
      INSPECTION_EXPIRED: ['Check period ended · payment completed', 'money'],
      OPEN_DISPUTE: ['Buyer reported a problem', 'dispute'],
      EVIDENCE_SUBMITTED: [`${who} added evidence`, 'info'],
      EVIDENCE_COMPLETE: ['Evidence is complete', 'info'],
      RECOMMENDATION_RECORDED: [e.payload.action === 'ESCALATE_HUMAN' ? 'Rules sent the case to a reviewer' : 'Rules made a recommendation', 'info'],
      DECISION: [`Reviewer decided: ${DECISION_TEXT[String(e.payload.outcome)] ?? 'decision recorded'}`, 'done'],
      HUMAN_SPLIT_PENDING: ['Reviewer recorded a split (pending)', 'done'],
      PARTIAL_REFUND_COMPLETED: ["Part of the money returned to the buyer", 'money'],
      SHIP_DEADLINE_PASSED: ['Not shipped in time · payment cancelled', 'money'],
      EXTERNAL_DISPUTE: ['PayPal case opened · deal on hold', 'dispute'],
      EXTERNAL_RESOLVED: ['PayPal case closed', 'done'],
      RETURN_DELIVERED: ['Return delivered to the seller', 'ship'],
      RETURN_DEADLINE_PASSED: ['Not returned in time · payment completed', 'money'],
      CANCEL: ['Deal cancelled', 'info'],
      COURIER_CLAIM_PACK_CREATED: ['Seller prepared a courier claim', 'ship'],
    } as Record<string, [string, ActivityKind]>)[e.type] ?? [eventTitle(e.type), 'info'];
    items.push({ seq: e.seq, text, kind, ts: e.ts });
    if (items.length >= limit) break;
  }
  return items;
}

export function relativeTime(ts: string, now: string): string {
  const minutes = Math.max(0, Math.round((Date.parse(now) - Date.parse(ts)) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}
