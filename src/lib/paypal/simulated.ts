// Simulated PayPal for demos without Sandbox keys (PAYPAL_MODE=simulated).
// No network calls are made and no money, real or Sandbox, moves. Ids start with "SIM-"
// so they can never be mistaken for PayPal ids, and the API marks every money step
// recorded in this mode with `simulated: true` in the audit log.
// The buyer "approves" on our own page /paypal/simulated, which is clearly labelled.

import { randomUUID } from 'node:crypto';
import type { PayPalClient } from './client';

export type PaymentGateway = Pick<PayPalClient,
  'createAuthorizeOrder' | 'authorizeOrder' | 'captureAuthorization' | 'voidAuthorization' | 'refundCapture' | 'getOrderStatus' | 'addTracking'>;

export type PayPalMode = 'sandbox' | 'simulated';

/** `simulated` only when explicitly requested; otherwise the real Sandbox client is used. */
export function payPalMode(env: Record<string, string | undefined> = process.env): PayPalMode {
  return env.PAYPAL_MODE?.trim().toLowerCase() === 'simulated' ? 'simulated' : 'sandbox';
}

export const SIMULATED_APPROVAL_PATH = '/paypal/simulated';

export function createSimulatedPayPal(): PaymentGateway {
  const id = (kind: string) => `SIM-${kind}-${randomUUID().slice(0, 8).toUpperCase()}`;
  return {
    async createAuthorizeOrder({ returnUrl }) {
      const orderId = id('ORDER');
      // Same origin as the return URL; only the transaction id and order token are passed on.
      const back = new URL(returnUrl);
      const approval = new URL(SIMULATED_APPROVAL_PATH, back.origin);
      approval.searchParams.set('txId', back.searchParams.get('txId') ?? '');
      approval.searchParams.set('token', orderId);
      return { orderId, status: 'PAYER_ACTION_REQUIRED', approvalUrl: approval.toString() };
    },
    // Reaching the return page with the matching token stands in for buyer approval.
    async getOrderStatus() { return 'APPROVED'; },
    async authorizeOrder() { return { orderStatus: 'COMPLETED', authorizationId: id('AUTH'), authorizationStatus: 'CREATED' }; },
    async captureAuthorization() { return { captureId: id('CAPTURE'), status: 'COMPLETED' }; },
    async voidAuthorization() { return undefined; },
    async refundCapture() { return { refundId: id('REFUND'), status: 'COMPLETED' }; },
    async addTracking({ trackingNumber }) { return { trackerId: `${id('TRACKER')}-${trackingNumber}` }; },
  };
}
