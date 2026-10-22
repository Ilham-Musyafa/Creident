import { usdCents } from '../partialAmount';
// Simulated PayPal for demos without Sandbox keys (PAYPAL_MODE=simulated).
// No network calls are made and no money, real or Sandbox, moves. Ids start with "SIM-"
// so they can never be mistaken for PayPal ids, and the API marks every money step
// recorded in this mode with `simulated: true` in the audit log.
// The buyer "approves" on our own page /paypal/simulated, which is clearly labelled.

import { randomUUID } from 'node:crypto';
import { PayPalError } from './client';
import type { DisputeClient, PayPalCase } from '../paypalDisputes';
import type { PayPalClient } from './client';

export type PaymentGateway = Pick<PayPalClient,
  'createAuthorizeOrder' | 'authorizeOrder' | 'captureAuthorization' | 'voidAuthorization' | 'refundCapture' | 'getOrderStatus' | 'addTracking'>;

export type SimulatedGateway = PaymentGateway & DisputeClient & { openSimulatedDispute(captureId: string): Promise<PayPalCase> };

export type PayPalMode = 'sandbox' | 'simulated';

/** `simulated` only when explicitly requested; otherwise the real Sandbox client is used. */
export function payPalMode(env: Record<string, string | undefined> = process.env): PayPalMode {
  return env.PAYPAL_MODE?.trim().toLowerCase() === 'simulated' ? 'simulated' : 'sandbox';
}

export const SIMULATED_APPROVAL_PATH = '/paypal/simulated';

export function createSimulatedPayPal(initialCases: PayPalCase[] = []): SimulatedGateway {
  const cases = new Map(initialCases.map(c => [c.id, structuredClone(c)]));
  const getCase = (id: string) => {
    const detail = cases.get(id);
    if (!detail) throw new PayPalError(404, 'RESOURCE_NOT_FOUND', 'INVALID_RESOURCE_ID', undefined, 'Simulated case not found');
    return detail;
  };
  const requireAction = (id: string, action: string) => {
    const detail = getCase(id);
    if (!detail.actions.includes(action)) throw new PayPalError(422, 'UNPROCESSABLE_ENTITY', 'ACTION_NOT_ALLOWED_IN_CURRENT_DISPUTE_STATE', undefined, 'Simulated case does not offer this action');
    return detail;
  };
  const id = (kind: string) => `SIM-${kind}-${randomUUID().slice(0, 8).toUpperCase()}`;
  return {
    async openSimulatedDispute(captureId) {
      const existing = [...cases.values()].find(c => c.sellerTransactionIds.includes(captureId));
      if (existing) return structuredClone(existing);
      const detail: PayPalCase = { id: id('DISPUTE'), status: 'WAITING_FOR_SELLER_RESPONSE', stage: 'INQUIRY',
        reason: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED', sellerTransactionIds: [captureId], actions: ['send_message', 'escalate'], outcome: undefined };
      cases.set(detail.id, detail);
      return structuredClone(detail);
    },
    async listDisputes(filter = {}) {
      return [...cases.values()].filter(c => !filter.disputedTransactionId || c.sellerTransactionIds.includes(filter.disputedTransactionId))
        .map(c => ({ id: c.id, status: c.status, stage: c.stage, reason: c.reason, amount: null, createdAt: undefined }));
    },
    async getDispute(id) { return structuredClone(getCase(id)); },
    async sendDisputeMessage(id) { requireAction(id, 'send_message'); return {}; },
    async provideEvidence(id) {
      const detail = requireAction(id, 'provide_evidence');
      detail.status = 'UNDER_REVIEW'; detail.actions = ['provide_supporting_info'];
      return {};
    },
    async escalateDispute(id) {
      const detail = requireAction(id, 'escalate');
      detail.stage = 'CHARGEBACK'; detail.status = 'WAITING_FOR_SELLER_RESPONSE'; detail.actions = ['provide_evidence'];
      return {};
    },
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
    async refundCapture(_captureId, _requestId, amount) {
      if (amount && (amount.currency !== 'USD' || !(usdCents(amount.value)! > 0))) throw new PayPalError(400, 'INVALID_REQUEST', 'INVALID_AMOUNT', undefined, 'Invalid simulated refund amount');
      return { refundId: id('REFUND'), status: 'COMPLETED' };
    },
    async addTracking({ trackingNumber }) { return { trackerId: `${id('TRACKER')}-${trackingNumber}` }; },
  };
}
