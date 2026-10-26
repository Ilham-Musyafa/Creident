import type { AuditEvent } from '../lib/audit/chain';
import type { StoredDecision, StoredRecommendation, StoredTx } from '../lib/repository';
import { Card } from './layoutPrimitives';
import { ButtonLink } from './ui';
import { money } from './view';

/** Receipt wording, based on recorded decisions and money events, without implying payout. */
export function DealDecisionSummary({ tx, decision, recommendation, events }: {
  tx: StoredTx; decision: StoredDecision; recommendation: StoredRecommendation | null; events: AuditEvent[];
}) {
  const moneyEvent = [...events].reverse().find(e => ['DECISION', 'RETURN_DELIVERED', 'RETURN_DEADLINE_PASSED', 'PARTIAL_REFUND_CAPTURED', 'PARTIAL_REFUND_COMPLETED'].includes(e.type) && e.payload.effect && e.payload.effect !== 'NONE');
  const partialAmount = decision.amount ?? tx.partialRefundAmount;
  const outcome = decision.outcome === 'PARTIAL_REFUND'
    ? tx.partialRefundState === 'completed' ? `Partial refund issued${partialAmount ? `: ${money(partialAmount)}` : ''}`
    : tx.partialRefundState === 'cancelled' ? 'Partial refund not executed: item not returned in time'
    : tx.status === 'RETURN_REQUESTED' ? 'Partial refund after the item is returned' : 'Partial refund pending'
    : decision.outcome === 'RELEASE' ? 'Payment charged'
    : decision.outcome === 'SPLIT' ? 'Split (pending: no money moved yet)'
    : tx.status === 'RETURN_REQUESTED' ? 'Refund after the item is returned'
    : moneyEvent?.type === 'RETURN_DEADLINE_PASSED' ? 'Payment completed: item not returned in time'
    : tx.status === 'VOIDED' ? moneyEvent?.type === 'RETURN_DELIVERED' ? 'Payment cancelled after return' : 'Payment cancelled'
    : moneyEvent?.type === 'RETURN_DELIVERED' ? 'Refund issued to the buyer after the return' : 'Refund issued to the buyer';
  const followed = recommendation ? recommendation.action === decision.outcome ? 'Yes'
    : recommendation.action === 'ESCALATE_HUMAN' ? 'A person decided, as the rules asked' : 'No, see reason' : '—';
  return <Card className="deal-decision space-y-3">
    <h2 className="text-lg text-heading">Decision</h2>
    <p className="font-semibold text-heading">{outcome}</p>
    {decision.amount && <p className="text-sm text-muted">Reviewer refund amount: {money(decision.amount)} USD · fee borne by Platform</p>}
    <div><p className="text-sm text-muted">Reviewer&apos;s reason</p><p className="mt-1 line-clamp-2 text-sm">{decision.reason}</p></div>
    <p className="text-sm text-muted">Reviewer followed it: <span className="font-semibold text-heading">{followed}</span></p>
    <ButtonLink href={`/deals/${tx.id}/decision`} variant="ghost" fullWidth>View decision receipt</ButtonLink>
  </Card>;
}
