import type { AuditEvent } from '../lib/audit/chain';
import type { StoredDecision, StoredTx } from '../lib/repository';
import { money } from './view';

/** Financial display labels only; never infers success from a reviewer choice alone. */
export function decisionOutcomeLabel(tx: StoredTx, decision: StoredDecision, events: AuditEvent[]): string {
  const returned = events.some(e => e.type === 'RETURN_DELIVERED');
  const returnExpired = events.some(e => e.type === 'RETURN_DEADLINE_PASSED');
  // These existing persisted states represent completed effects, not requested effects.
  const refunded = tx.status === 'REFUNDED' || (tx.status === 'FROZEN_EXTERNAL' && tx.frozenFrom === 'REFUNDED');
  const voided = tx.status === 'VOIDED' || (tx.status === 'FROZEN_EXTERNAL' && tx.frozenFrom === 'VOIDED');
  const partialRefunded = tx.partialRefundState === 'completed' || tx.status === 'PARTIALLY_REFUNDED'
    || (tx.status === 'FROZEN_EXTERNAL' && tx.frozenFrom === 'PARTIALLY_REFUNDED');
  const partialAmount = decision.amount ?? tx.partialRefundAmount;
  return decision.outcome === 'PARTIAL_REFUND'
    ? partialRefunded ? `Partial refund issued${partialAmount ? `: ${money(partialAmount, tx.currency)}` : ''}`
    : tx.partialRefundState === 'cancelled' ? 'Partial refund not executed'
    : tx.status === 'RETURN_REQUESTED' ? 'Partial refund decision recorded · awaiting return' : 'Partial refund decision recorded · payment step pending'
    : decision.outcome === 'RELEASE' ? tx.captured ? 'Payment charged' : 'Decision recorded · payment step pending'
    : decision.outcome === 'SPLIT' ? 'Split decision recorded · payment step pending'
    : refunded ? returned ? 'Refund issued to the buyer after the return' : 'Refund issued to the buyer'
    : voided ? returned ? 'Payment cancelled after return' : 'Payment cancelled'
    : tx.status === 'RETURN_REQUESTED' ? 'Refund decision recorded · awaiting return'
    : tx.captured && returnExpired ? 'Payment charged · return deadline passed'
    : 'Decision recorded · payment step pending';
}
