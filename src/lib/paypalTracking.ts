// After a capture, send the seller's tracking number to PayPal so the PayPal transaction
// carries proof of shipment (useful if the buyer later opens a dispute on PayPal's side).
// This step never changes the deal's status: the capture already happened. A failure is
// recorded in the audit log and retried by the deadline job, at most MAX_ATTEMPTS times.

import { PayPalError, requestIdFor, type PayPalClient } from './paypal/client';
import type { TransactionRepository } from './repository';

export type TrackingClient = Pick<PayPalClient, 'addTracking'>;
export type TrackingOutcome = 'sent' | 'skipped' | 'failed' | 'already-sent' | 'gave-up';

export const TRACKING_ADDED = 'PAYPAL_TRACKING_ADDED';
export const TRACKING_FAILED = 'PAYPAL_TRACKING_FAILED';
export const MAX_ATTEMPTS = 3;
// The courier is simulated in this prototype, so PayPal gets carrier OTHER with this name.
export const CARRIER_NAME = 'HalcyVault demo courier';

export interface TrackingDeps {
  repo: TransactionRepository;
  paypal: TrackingClient;
  now: () => string;
  actor?: string;
  eventPayload?: Record<string, unknown>;
}

export async function sendTrackingToPayPal(txId: string, deps: TrackingDeps): Promise<TrackingOutcome> {
  const tx = deps.repo.loadTransaction(txId);
  if (!tx || !tx.captured || !tx.paypalOrderId || !tx.paypalCaptureId || !tx.trackingNumber) return 'skipped';
  const events = deps.repo.readEvents(txId);
  if (events.some((e) => e.type === TRACKING_ADDED)) return 'already-sent';
  const attempt = events.filter((e) => e.type === TRACKING_FAILED).length + 1;
  if (attempt > MAX_ATTEMPTS) return 'gave-up';

  const requestId = requestIdFor(txId, 'PAYPAL_ADD_TRACKING', attempt);
  const claim = deps.repo.claimAction(txId, 'PAYPAL_ADD_TRACKING', requestId);
  if (!claim.claimed) return claim.record.state === 'success' ? 'already-sent' : 'failed';

  const base = { trackingNumber: tx.trackingNumber, carrier: 'OTHER', carrierName: CARRIER_NAME, requestId, attempt, ...deps.eventPayload };
  try {
    const { trackerId } = await deps.paypal.addTracking({
      orderId: tx.paypalOrderId, captureId: tx.paypalCaptureId, trackingNumber: tx.trackingNumber,
      carrierName: CARRIER_NAME, requestId,
    });
    deps.repo.saveSideEffect(requestId, txId, { txId, ts: deps.now(), actor: deps.actor ?? 'system', type: TRACKING_ADDED, payload: { ...base, trackerId } });
    return 'sent';
  } catch (error) {
    const e = error instanceof PayPalError ? error : null;
    deps.repo.savePayPalFailure(requestId, {
      state: 'error', status: e?.status ?? 0, code: e?.code ?? 'TRACKING_ERROR', issue: e?.issue,
      debugId: e?.debugId, message: error instanceof Error ? error.message : String(error),
    }, {
      txId, ts: deps.now(), actor: deps.actor ?? 'system', type: TRACKING_FAILED,
      payload: { ...base, code: e?.code ?? 'TRACKING_ERROR', issue: e?.issue ?? null, debug_id: e?.debugId ?? null },
    });
    return 'failed';
  }
}
