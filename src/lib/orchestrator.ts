import type { Trigger, Effect } from './domain/types';
import { transition } from './domain/stateMachine';
import { PayPalError, requestIdFor, type PayPalClient } from './paypal/client';
import { TransactionRepository, type ActionRecord, type StoredTx } from './repository';

type PaymentClient = Pick<PayPalClient,
  'createAuthorizeOrder' | 'authorizeOrder' | 'captureAuthorization' | 'voidAuthorization' | 'refundCapture'>;

export interface OrchestratorDeps {
  repo: TransactionRepository;
  paypal: PaymentClient;
  actor?: string;
  now?: () => string;
  returnUrl?: string;
  cancelUrl?: string;
}

export class DomainError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export type ApplyResult =
  | { ok: true; tx: StoredTx; approvalUrl?: string }
  | { ok: false; error: DomainError | PayPalError };

function effectForTrigger(trigger: Trigger, captured: boolean): Effect['kind'] | null {
  switch (trigger.type) {
    case 'START_PAYMENT': return 'PAYPAL_CREATE_ORDER';
    case 'BUYER_APPROVED': return 'PAYPAL_AUTHORIZE';
    case 'SHIP_DEADLINE_PASSED': return 'PAYPAL_VOID';
    case 'BUYER_CONFIRM':
    case 'INSPECTION_EXPIRED': return 'PAYPAL_CAPTURE';
    case 'DECISION': return trigger.outcome === 'RELEASE'
      ? 'PAYPAL_CAPTURE' : captured ? 'PAYPAL_REFUND' : 'PAYPAL_VOID';
    default: return null;
  }
}

function cachedResult(record: ActionRecord): ApplyResult {
  if (record.state === 'success') return { ok: true, tx: record.tx, approvalUrl: record.approvalUrl };
  if (record.state === 'error') {
    return { ok: false, error: new PayPalError(
      record.status, record.code, record.issue, record.debugId, record.message,
    ) };
  }
  return { ok: false, error: new DomainError('ACTION_PENDING', 'PayPal action needs reconciliation before retry') };
}

async function performEffect(
  effect: Effect['kind'], tx: StoredTx, requestId: string, deps: OrchestratorDeps,
): Promise<{ ids: Partial<Pick<StoredTx, 'paypalOrderId' | 'paypalAuthId' | 'paypalCaptureId'>>; approvalUrl?: string }> {
  switch (effect) {
    case 'NONE': return { ids: {} };
    case 'PAYPAL_CREATE_ORDER': {
      if (!deps.returnUrl || !deps.cancelUrl) throw new DomainError('MISSING_PAYMENT_URLS', 'Payment return and cancel URLs are required');
      const result = await deps.paypal.createAuthorizeOrder({
        amount: { currency: tx.currency, value: tx.amount },
        returnUrl: deps.returnUrl, cancelUrl: deps.cancelUrl, requestId,
      });
      return { ids: { paypalOrderId: result.orderId }, approvalUrl: result.approvalUrl };
    }
    case 'PAYPAL_AUTHORIZE': {
      if (!tx.paypalOrderId) throw new DomainError('MISSING_ORDER_ID', 'Transaction has no PayPal order');
      const result = await deps.paypal.authorizeOrder(tx.paypalOrderId, requestId);
      return { ids: { paypalAuthId: result.authorizationId } };
    }
    case 'PAYPAL_CAPTURE': {
      if (!tx.paypalAuthId) throw new DomainError('MISSING_AUTH_ID', 'Transaction has no PayPal authorization');
      const result = await deps.paypal.captureAuthorization(tx.paypalAuthId, requestId);
      if (!result.captureId || result.captureId === 'undefined') throw new Error('PayPal capture response has no capture id');
      return { ids: { paypalCaptureId: result.captureId } };
    }
    case 'PAYPAL_VOID': {
      if (!tx.paypalAuthId) throw new DomainError('MISSING_AUTH_ID', 'Transaction has no PayPal authorization');
      await deps.paypal.voidAuthorization(tx.paypalAuthId, requestId);
      return { ids: {} };
    }
    case 'PAYPAL_REFUND': {
      if (!tx.paypalCaptureId) throw new DomainError('MISSING_CAPTURE_ID', 'Transaction has no PayPal capture');
      await deps.paypal.refundCapture(tx.paypalCaptureId, requestId);
      return { ids: {} };
    }
  }
}

export async function applyTrigger(txId: string, trigger: Trigger, deps: OrchestratorDeps): Promise<ApplyResult> {
  const tx = deps.repo.loadTransaction(txId);
  if (!tx) return { ok: false, error: new DomainError('NOT_FOUND', `Transaction ${txId} was not found`) };

  const action = effectForTrigger(trigger, tx.captured);
  const requestId = action ? requestIdFor(txId, action) : undefined;
  if (requestId) {
    const previous = deps.repo.getAction(requestId);
    if (previous) return cachedResult(previous);
  }

  const result = transition(tx, trigger);
  if (!result.ok) return { ok: false, error: new DomainError(result.code, result.message) };
  if (result.effect.kind !== 'NONE' && result.effect.kind !== action) {
    throw new Error('Trigger-to-effect mapping does not match the state machine');
  }

  if (requestId && result.effect.kind !== 'NONE') {
    // Validate local inputs before reserving the request id. A reserved id is never sent twice.
    if (action === 'PAYPAL_CREATE_ORDER' && (!deps.returnUrl || !deps.cancelUrl))
      return { ok: false, error: new DomainError('MISSING_PAYMENT_URLS', 'Payment return and cancel URLs are required') };
    if (action === 'PAYPAL_AUTHORIZE' && !tx.paypalOrderId)
      return { ok: false, error: new DomainError('MISSING_ORDER_ID', 'Transaction has no PayPal order') };
    if ((action === 'PAYPAL_CAPTURE' || action === 'PAYPAL_VOID') && !tx.paypalAuthId)
      return { ok: false, error: new DomainError('MISSING_AUTH_ID', 'Transaction has no PayPal authorization') };
    if (action === 'PAYPAL_REFUND' && !tx.paypalCaptureId)
      return { ok: false, error: new DomainError('MISSING_CAPTURE_ID', 'Transaction has no PayPal capture') };
    const claim = deps.repo.claimAction(txId, action!, requestId);
    if (!claim.claimed) return cachedResult(claim.record);
  }

  const actor = deps.actor ?? 'system';
  const now = deps.now ?? (() => new Date().toISOString());
  try {
    const payment = await performEffect(result.effect.kind, tx, requestId ?? '', deps);
    const saved = deps.repo.saveTransition(tx, result.tx, payment.ids, {
      txId, ts: now(), actor, type: trigger.type,
      payload: {
        from: tx.status, to: result.tx.status, effect: result.effect.kind,
        ...(requestId ? { requestId } : {}),
        ...payment.ids,
      },
    }, requestId, payment.approvalUrl);
    return { ok: true, tx: saved, approvalUrl: payment.approvalUrl };
  } catch (error) {
    if (!(error instanceof PayPalError) || !requestId) throw error;
    deps.repo.savePayPalFailure(requestId, {
      state: 'error', status: error.status, code: error.code, issue: error.issue,
      debugId: error.debugId, message: error.message,
    }, {
      txId, ts: now(), actor, type: 'PAYPAL_ERROR',
      payload: {
        trigger: trigger.type, effect: result.effect.kind, requestId,
        code: error.code, issue: error.issue ?? null, debug_id: error.debugId ?? null,
      },
    });
    return { ok: false, error };
  }
}
