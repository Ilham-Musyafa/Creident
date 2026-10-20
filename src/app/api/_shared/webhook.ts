import { ApiSetupError, getApiContext, getPayPal } from './context';
import { HttpError, json, route } from './http';
import type { WebhookSignature } from '../../../lib/paypal/client';

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function id(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 ? value : undefined;
}

function signatureHeaders(request: Request): WebhookSignature {
  const header = (name: string): string => {
    const value = request.headers.get(name);
    if (!value || value.length > 2048) throw new HttpError(400, 'MISSING_SIGNATURE', `Missing or invalid ${name}`);
    return value;
  };
  return {
    authAlgo: header('paypal-auth-algo'),
    certUrl: header('paypal-cert-url'),
    transmissionId: header('paypal-transmission-id'),
    transmissionSig: header('paypal-transmission-sig'),
    transmissionTime: header('paypal-transmission-time'),
  };
}

function relatedIds(type: string, resource: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  const add = (value: unknown) => { const candidate = id(value); if (candidate) ids.add(candidate); };
  const related = record(record(resource.supplementary_data)?.related_ids);
  for (const key of ['order_id', 'authorization_id', 'capture_id']) add(related?.[key]);
  for (const key of ['order_id', 'authorization_id', 'capture_id', 'transaction_id']) add(resource[key]);
  if (type === 'PAYMENT.CAPTURE.REVERSED') add(resource.id);
  if (type.startsWith('PAYMENT.AUTHORIZATION.')) add(resource.id);
  if (type.startsWith('CHECKOUT.ORDER.')) add(resource.id);
  if (type.startsWith('PAYMENT.CAPTURE.') && type !== 'PAYMENT.CAPTURE.REVERSED') add(resource.id);
  if (Array.isArray(resource.disputed_transactions)) {
    for (const item of resource.disputed_transactions) {
      const disputed = record(item);
      add(disputed?.seller_transaction_id);
      add(disputed?.buyer_transaction_id);
    }
  }
  return [...ids];
}

export function paypalWebhook(request: Request): Promise<Response> {
  return route(async () => {
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      throw new HttpError(415, 'JSON_REQUIRED', 'Send application/json');
    }
    if (Number(request.headers.get('content-length') ?? 0) > 1_048_576) {
      throw new HttpError(413, 'BODY_TOO_LARGE', 'Webhook exceeds 1 MB');
    }
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 1_048_576) throw new HttpError(413, 'BODY_TOO_LARGE', 'Webhook exceeds 1 MB');
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new HttpError(400, 'INVALID_JSON', 'Invalid webhook JSON'); }
    const body = record(parsed);
    const eventId = id(body?.id);
    const eventType = id(body?.event_type);
    const resource = record(body?.resource);
    if (!body || !eventId || !eventType || !resource) throw new HttpError(400, 'INVALID_EVENT', 'Webhook needs id, event_type, and resource');
    const signature = signatureHeaders(request);
    const webhookId = process.env.PP_WEBHOOK_ID;
    if (!webhookId) throw new ApiSetupError('PP_WEBHOOK_ID is required for PayPal webhook verification');
    const context = getApiContext();
    const valid = await getPayPal(context).verifyWebhookSignature(webhookId, signature, body);
    if (!valid) throw new HttpError(401, 'UNVERIFIED_WEBHOOK', 'PayPal did not verify this webhook');
    const result = context.repo.processVerifiedWebhook({
      id: eventId, type: eventType, resourceId: id(resource.id),
      relatedIds: relatedIds(eventType, resource), receivedAt: context.now(),
    });
    return json({ received: true, duplicate: result.duplicate, txId: result.txId, status: result.status });
  });
}
