// Presentation only: existing role actions and stored deadlines drive the list.
import type { StoredTx } from '../lib/repository';
import type { TxStatus } from '../lib/domain/types';
import { deadlineUrgency, isActive, money, nextAction, timeLeft, type Role, type Urgency } from './view';

export const TRANSACTION_FILTERS = { all: 'All', action: 'Needs your action', active: 'Active', review: 'Under review', closed: 'Closed' } as const;
export type TransactionFilter = keyof typeof TRANSACTION_FILTERS;
export type ItemIconName = 'phone' | 'laptop' | 'camera' | 'audio' | 'console' | 'watch' | 'game' | 'lamp' | 'helmet' | 'keyboard' | 'drone' | 'stove' | 'package';
export interface TransactionRow {
  category?: unknown; subcategory?: unknown;
  id: string; title: string; demo: boolean; icon: ItemIconName; status: TxStatus;
  amount: string; active: boolean; needsAction: boolean; nextStep: string;
  href: string; deadline: number | null; deadlineLabel: string | null; urgency: Urgency | null; createdAt: string | null;
}
/** Short fixed-zone date for lists, e.g. "30 Oct 2026". */
export function shortDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isFinite(time) ? new Date(time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : null;
}
export function readTransactionFilter(value: unknown): TransactionFilter {
  return typeof value === 'string' && Object.hasOwn(TRANSACTION_FILTERS, value) ? value as TransactionFilter : 'all';
}
export function transactionQuery(value: unknown): string { return typeof value === 'string' ? value.slice(0, 200) : ''; }
function terms(value: string): Record<string, unknown> {
  try { const result: unknown = JSON.parse(value); return result !== null && typeof result === 'object' && !Array.isArray(result) ? result as Record<string, unknown> : {}; } catch { return {}; }
}
export function itemIcon(category: unknown, title: string): ItemIconName {
  if (typeof category === 'string' && ['phone', 'laptop', 'camera', 'audio', 'console'].includes(category)) return category as ItemIconName;
  const patterns: [RegExp, ItemIconName][] = [
    [/\b(?:smartwatch|watch)\b/i, 'watch'], [/\bboard\s*game\b/i, 'game'], [/\blamp\b/i, 'lamp'],
    [/\bhelmet\b/i, 'helmet'], [/\bkeyboard\b/i, 'keyboard'], [/\bdrone\b/i, 'drone'], [/\bstove\b/i, 'stove'],
    [/\bphone\b/i, 'phone'], [/\blaptop\b/i, 'laptop'], [/\bcamera\b/i, 'camera'],
    [/\b(?:earbuds|headphones|speaker)\b/i, 'audio'], [/\bconsole\b/i, 'console'],
  ];
  return patterns.find(([pattern]) => pattern.test(title))?.[1] ?? 'package';
}
const ACTION = { 'accept-terms': 'Accept terms', pay: 'Start payment', 'wait-approval': 'Approve on PayPal', ship: 'Add tracking', 'confirm-or-dispute': 'Confirm or report a problem', 'add-evidence': 'Add evidence', review: 'Review dispute', 'ship-return': 'Add return tracking' } as const;
const WAITING: Record<TxStatus, string> = {
  DRAFT: 'Waiting for terms acceptance', TERMS_LOCKED: 'Waiting for buyer payment', AWAITING_APPROVAL: 'Waiting for buyer approval',
  AUTHORIZED: 'Waiting for seller to ship', SHIPPED: 'Waiting for delivery', IN_INSPECTION: 'Waiting for buyer inspection',
  DISPUTED: 'Waiting for evidence', UNDER_REVIEW: 'Waiting for reviewer', RETURN_REQUESTED: 'Waiting for the return',
  FROZEN_EXTERNAL: 'Waiting for PayPal case update', COMPLETED: 'No action needed', REFUNDED: 'No action needed',
  PARTIALLY_REFUNDED: 'No action needed', VOIDED: 'No action needed', CANCELLED: 'No action needed',
};
export function transactionRow(tx: StoredTx, role: Role, now: string, accepted: readonly string[] = [], createdAt: string | null = null): TransactionRow {
  const metadata = terms(tx.termsJson);
  const demo = metadata.demo === true || /^\[Demo\]\s*/i.test(tx.item);
  const title = demo ? tx.item.replace(/^\[Demo\]\s*/i, '') || tx.item : tx.item;
  const suggested = nextAction(tx.status, role);
  const action = suggested === 'accept-terms' && accepted.includes(role) ? 'none' : suggested;
  const rawDeadline = tx.status === 'AUTHORIZED' ? tx.shipBy : tx.status === 'IN_INSPECTION' ? tx.inspectionUntil : tx.status === 'DISPUTED' ? tx.evidenceUntil : tx.status === 'RETURN_REQUESTED' ? tx.returnBy : undefined;
  const deadline = rawDeadline && Number.isFinite(Date.parse(rawDeadline)) ? Date.parse(rawDeadline) : null;
  const remaining = deadline !== null ? timeLeft(rawDeadline, now) : null;
  const deadlineLabel = deadline === null ? null : remaining ? remaining.replace(/(\d+)([dhm])/g, (_, n: string, unit: string) => `${n} ${{ d: 'day', h: 'hour', m: 'minute' }[unit]}${n === '1' ? '' : 's'}`) : 'Deadline passed';
  let href = `/deals/${tx.id}`;
  if (action === 'review') href += '/review';
  else if (action === 'add-evidence') href += '/evidence';
  else if (action === 'pay' || (action === 'accept-terms' && role === 'buyer')) href += '/checkout';
  const refundPending = tx.partialRefundState === 'pending' || tx.partialRefundState === 'ready';
  return { category: metadata.category, subcategory: metadata.subcategory, id: tx.id, title, demo, icon: itemIcon(metadata.category, title), status: tx.status,
    amount: money(tx.amount, tx.currency), active: isActive(tx.status), needsAction: action !== 'none',
    nextStep: action !== 'none' ? ACTION[action] : refundPending ? 'Refund pending verification' : WAITING[tx.status], href, deadline, deadlineLabel, urgency: action !== 'none' ? deadlineUrgency(rawDeadline, now) : null, createdAt };
}
/** Newest deal first (by created time), so a deal made just now sits at the top; deals without a created time go last. */
export function sortTransactionRows(rows: readonly TransactionRow[]): TransactionRow[] {
  const created = (row: TransactionRow) => (row.createdAt ? Date.parse(row.createdAt) || 0 : 0);
  return [...rows].sort((a, b) => created(b) - created(a) || b.id.localeCompare(a.id));
}
export function matchesTransactionFilter(row: TransactionRow, filter: TransactionFilter): boolean {
  return filter === 'action' ? row.needsAction : filter === 'active' ? row.active : filter === 'review' ? row.status === 'UNDER_REVIEW' : filter === 'closed' ? !row.active : true;
}
export function searchTransactionRows(rows: readonly TransactionRow[], query: string): TransactionRow[] {
  const needle = transactionQuery(query).trim().toLowerCase();
  return rows.filter(row => row.title.toLowerCase().includes(needle));
}

/** Home has no date groups: role actions, then active deals, then closed deals. */
export function sortHomeRows(rows: readonly TransactionRow[]): TransactionRow[] {
  const priority = (row: TransactionRow) => row.needsAction ? 0 : row.active ? 1 : 2;
  return [...rows].sort((a, b) => priority(a) - priority(b)
    || (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0)
    || b.id.localeCompare(a.id));
}
