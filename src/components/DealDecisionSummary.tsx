import type { AuditEvent } from '../lib/audit/chain';
import type { StoredDecision, StoredRecommendation, StoredTx } from '../lib/repository';
import { Card } from './layoutPrimitives';
import { ButtonLink } from './ui';
import { money } from './view';

/** A reviewer choice is not proof that its payment step succeeded. */
export function DealDecisionSummary({ tx, decision, recommendation, events }: {
  tx: StoredTx; decision: StoredDecision; recommendation: StoredRecommendation | null; events: AuditEvent[];
}) {
  const returned = events.some(e => e.type === 'RETURN_DELIVERED');
  const returnExpired = events.some(e => e.type === 'RETURN_DEADLINE_PASSED');
  // These existing persisted states represent completed effects, not requested effects.
  const refunded = tx.status === 'REFUNDED' || (tx.status === 'FROZEN_EXTERNAL' && tx.frozenFrom === 'REFUNDED');
  const voided = tx.status === 'VOIDED' || (tx.status === 'FROZEN_EXTERNAL' && tx.frozenFrom === 'VOIDED');
  const partialRefunded = tx.partialRefundState === 'completed' || tx.status === 'PARTIALLY_REFUNDED'
    || (tx.status === 'FROZEN_EXTERNAL' && tx.frozenFrom === 'PARTIALLY_REFUNDED');
  const partialAmount = decision.amount ?? tx.partialRefundAmount;
  const outcome = decision.outcome === 'PARTIAL_REFUND'
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
  const followed = recommendation ? recommendation.action === decision.outcome ? 'Yes'
    : recommendation.action === 'ESCALATE_HUMAN' ? 'A person decided, as the rules asked' : 'No, see reason' : '—';
  return <Card className="deal-decision space-y-3">
    <h2 className="text-lg text-heading">Decision</h2>
    <p className="font-semibold text-heading">{outcome}</p>
    {decision.outcome === 'PARTIAL_REFUND' && partialAmount && <p className="text-sm text-muted">Reviewer refund amount: {money(partialAmount, tx.currency)} {tx.currency}</p>}
    <div><p className="text-sm text-muted">Reviewer&apos;s reason</p><p className="mt-1 line-clamp-2 text-sm">{decision.reason}</p></div>
    <p className="text-sm text-muted">Reviewer followed it: <span className="font-semibold text-heading">{followed}</span></p>
    <ButtonLink href={`/deals/${tx.id}/decision`} variant="ghost" fullWidth>View decision receipt</ButtonLink>
  </Card>;
}
