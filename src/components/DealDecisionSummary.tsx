import type { AuditEvent } from '../lib/audit/chain';
import type { StoredDecision, StoredRecommendation, StoredTx } from '../lib/repository';
import { Card } from './layoutPrimitives';
import { ButtonLink } from './ui';
import { money } from './view';
import { decisionOutcomeLabel } from './decisionCopy';

/** A reviewer choice is not proof that its payment step succeeded. */
export function DealDecisionSummary({ tx, decision, recommendation, events }: {
  tx: StoredTx; decision: StoredDecision; recommendation: StoredRecommendation | null; events: AuditEvent[];
}) {
  const partialAmount = decision.amount ?? tx.partialRefundAmount;
  const outcome = decisionOutcomeLabel(tx, decision, events);
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
