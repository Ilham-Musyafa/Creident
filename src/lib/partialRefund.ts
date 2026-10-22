// Capture and refund are separate durable stages. An interrupted/failed stage is never sent twice.
import { transition } from './domain/stateMachine';
import type { Trigger } from './domain/types';
import { PayPalError, requestIdFor } from './paypal/client';
import { DomainError, cachedResult, type ApplyResult, type OrchestratorDeps } from './orchestrator';
import { decisionBasis } from './decisionBasis';
import type { StoredTx } from './repository';
import { validPartialAmount } from './partialAmount';

export async function applyPartialRefund(initial: StoredTx, trigger: Trigger, deps: OrchestratorDeps): Promise<ApplyResult> {
  const { repo } = deps; const now = deps.now ?? (() => new Date().toISOString()); const actor = deps.actor ?? 'reviewer';
  const fail = (code: string, message: string): ApplyResult => ({ ok: false, error: new DomainError(code, message) });
  let tx = initial;
  if (tx.status === 'FROZEN_EXTERNAL') return fail('EXTERNAL_DISPUTE_OPEN', 'A PayPal dispute is open');
  let plan = repo.readEvents(tx.id).find(e => e.type === 'DECISION' && e.payload.outcome === 'PARTIAL_REFUND');
  if (trigger.type === 'DECISION') {
    if (!validPartialAmount(trigger.amount, tx.amount)) return fail('INVALID_AMOUNT', 'Partial refund must be positive USD below the deal amount with two decimals');
    const decision = deps.extras?.decision;
    if (!decision || decision.outcome !== 'PARTIAL_REFUND' || !decision.reason.trim()) return fail('REASON_REQUIRED', 'A human reason is required');
    if (plan) {
      if (plan.payload.amount !== trigger.amount || plan.payload.reason !== decision.reason || plan.payload.requireReturn !== !!trigger.requireReturn) {
        return fail('PARTIAL_DECISION_CONFLICT', 'The recorded partial refund amount, reason and return choice cannot be replaced');
      }
    } else {
      const proposed = transition(tx, trigger);
      if (!proposed.ok) return fail(proposed.code, proposed.message);
      if (trigger.requireReturn && !deps.extras?.returnBy) return fail('NO_DEADLINE', 'A required return needs a deadline');
      tx = repo.saveTransition(tx, { ...tx, status: trigger.requireReturn ? 'RETURN_REQUESTED' : 'UNDER_REVIEW',
        partialRefundAmount: trigger.amount, partialRefundState: trigger.requireReturn ? 'awaiting_return' : 'ready' }, {}, {
        txId: tx.id, ts: now(), actor, type: 'DECISION', payload: { ...deps.eventPayload,
          ...decisionBasis(tx.termsJson, repo.loadEvidence(tx.id)), outcome: 'PARTIAL_REFUND', amount: trigger.amount, currency: 'USD', reason: decision.reason,
          requireReturn: !!trigger.requireReturn, from: tx.status, to: trigger.requireReturn ? 'RETURN_REQUESTED' : 'UNDER_REVIEW', effect: 'NONE' },
      }, undefined, undefined, { ...deps.extras, decision: { ...decision, amount: trigger.amount, requireReturn: !!trigger.requireReturn } });
      plan = repo.readEvents(tx.id).find(e => e.type === 'DECISION' && e.payload.outcome === 'PARTIAL_REFUND');
    }
  }
  if (!plan || !tx.partialRefundAmount) return fail('NO_PARTIAL_DECISION', 'No partial refund decision is recorded');
  if (trigger.type === 'RETURN_DELIVERED' && plan.payload.requireReturn !== true) return fail('RETURN_NOT_REQUIRED', 'This partial refund does not require a return');
  if (tx.partialRefundState === 'cancelled') return fail('RETURN_EXPIRED', 'No partial refund is due: the required return deadline passed');
  if (tx.partialRefundState === 'completed') return { ok: true, tx };
  if (tx.partialRefundState === 'awaiting_return') {
    if (trigger.type === 'DECISION') return { ok: true, tx };
    const returned = transition(tx, trigger);
    if (!returned.ok) return fail(returned.code, returned.message);
    tx = repo.saveTransition(tx, { ...tx, partialRefundState: 'ready' }, {}, {
      txId: tx.id, ts: now(), actor, type: 'RETURN_DELIVERED', payload: { ...plan.payload, ...deps.eventPayload,
        from: tx.status, to: tx.status, effect: 'NONE', amount: tx.partialRefundAmount },
    }, undefined, undefined, { returnTracking: deps.extras?.returnTracking });
  }
  const base = plan.payload;
  for (const stage of ['capture', 'refund'] as const) {
    tx = repo.loadTransaction(tx.id)!;
    if (tx.status === 'FROZEN_EXTERNAL') return fail('EXTERNAL_DISPUTE_OPEN', 'A PayPal dispute is open; check the recorded capture before refunding');
    if (stage === 'capture' && tx.captured) {
      if (!tx.paypalCaptureId) return fail('MISSING_CAPTURE_ID', 'The recorded capture must be checked before refund');
      if (tx.status !== 'COMPLETED') tx = repo.saveTransition(tx, { ...tx, status: 'COMPLETED', partialRefundState: 'pending' }, {}, {
        txId: tx.id, ts: now(), actor, type: 'PARTIAL_REFUND_CAPTURED',
        payload: { ...base, from: tx.status, to: 'COMPLETED', effect: 'NONE', alreadyCaptured: true, paypalCaptureId: tx.paypalCaptureId },
      });
      continue;
    }
    if (stage === 'capture' && !['UNDER_REVIEW', 'RETURN_REQUESTED'].includes(tx.status)) return fail('INVALID_STATE', 'Partial capture requires an approved review decision');
    if (stage === 'refund' && (tx.status !== 'COMPLETED' || !tx.paypalCaptureId)) return fail('MISSING_CAPTURE_ID', 'A completed capture is required before refund');
    if (stage === 'capture' && !tx.paypalAuthId) return fail('MISSING_AUTH_ID', 'Transaction has no authorization');
    const effect = stage === 'capture' ? 'PAYPAL_CAPTURE' : 'PAYPAL_PARTIAL_REFUND';
    const requestId = requestIdFor(tx.id, effect);
    const previous = repo.getAction(requestId);
    if (previous && previous.state !== 'success') return cachedResult(previous);
    if (!previous && !deps.paypal) return fail('PAYPAL_UNAVAILABLE', 'PayPal client is required for this action');
    const claim = repo.claimAction(tx.id, effect, requestId);
    if (!claim.claimed) {
      if (claim.record.state === 'success') continue;
      return cachedResult(claim.record);
    }
    try {
      if (stage === 'capture') {
        const captured = await deps.paypal!.captureAuthorization(tx.paypalAuthId!, requestId);
        if (!captured.captureId || captured.captureId === 'undefined' || captured.status !== 'COMPLETED') throw new DomainError('CAPTURE_UNCONFIRMED', 'Capture result requires manual checking');
        tx = repo.saveTransition(tx, { ...tx, status: 'COMPLETED', captured: true, partialRefundState: 'pending' }, { paypalCaptureId: captured.captureId }, {
          txId: tx.id, ts: now(), actor, type: 'PARTIAL_REFUND_CAPTURED',
          payload: { ...base, from: tx.status, to: 'COMPLETED', effect: 'PAYPAL_CAPTURE', requestId, paypalCaptureId: captured.captureId, capturedAmount: tx.amount },
        }, requestId);
      } else {
        const refunded = await deps.paypal!.refundCapture(tx.paypalCaptureId!, requestId, { currency: 'USD', value: tx.partialRefundAmount! });
        if (!refunded.refundId || refunded.refundId === 'undefined' || refunded.status !== 'COMPLETED') throw new DomainError('REFUND_UNCONFIRMED', 'Refund result requires manual checking');
        tx = repo.saveTransition(tx, { ...tx, status: 'PARTIALLY_REFUNDED', partialRefundState: 'completed' }, {}, {
          txId: tx.id, ts: now(), actor, type: 'PARTIAL_REFUND_COMPLETED',
          payload: { ...base, from: tx.status, to: 'PARTIALLY_REFUNDED', effect: 'PAYPAL_PARTIAL_REFUND', requestId, refundId: refunded.refundId, paypalCaptureId: tx.paypalCaptureId },
        }, requestId);
      }
    } catch (error) {
      const payload = { ...base, trigger: trigger.type, effect, requestId, refundPending: stage === 'refund',
        code: error instanceof PayPalError ? error.code : 'ACTION_PENDING', issue: error instanceof PayPalError ? error.issue ?? null : null,
        debug_id: error instanceof PayPalError ? error.debugId ?? null : null };
      if (error instanceof PayPalError) {
        repo.savePayPalFailure(requestId, { state: 'error', status: error.status, code: error.code, issue: error.issue, debugId: error.debugId, message: 'PayPal action failed; manual verification is required' }, {
          txId: tx.id, ts: now(), actor, type: 'PAYPAL_ERROR', payload,
        });
        return { ok: false, error };
      }
      // Transport errors, pending PayPal responses and local commit failures are ambiguous.
      // Keep the reservation pending, log no raw error and never guess a remote result.
      repo.appendAuditEvent({ txId: tx.id, ts: now(), actor, type: 'PAYPAL_ERROR', payload });
      return fail('ACTION_PENDING', 'Payment outcome needs manual verification before retry');
    }
  }
  return { ok: true, tx: repo.loadTransaction(tx.id)! };
}
