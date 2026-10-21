// Minimal PayPal REST client for the calls this project needs (Orders v2 + Payments v2).
// Uses plain fetch so no SDK dependency is required. Request and response shapes match the
// calls verified by hand in the Sandbox (docs/SANDBOX-NOTES.md).
//
// Every money-moving call takes a `requestId`, sent as `PayPal-Request-Id`, so a retried
// request is not executed twice. Use `requestIdFor()` to derive it from the transaction.

export interface PayPalConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  fetchImpl?: typeof fetch;
  /** Injectable clock (ms) for tests. */
  now?: () => number;
}

export class PayPalError extends Error {
  constructor(
    readonly status: number,
    /** PayPal's error name, e.g. UNPROCESSABLE_ENTITY. */
    readonly code: string,
    /** First `details[].issue`, e.g. PREVIOUSLY_CAPTURED. Use this for program logic. */
    readonly issue: string | undefined,
    /** Store in the audit log; PayPal support asks for it. */
    readonly debugId: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'PayPalError';
  }
}

export interface Money {
  currency: string;
  value: string;
}

export interface WebhookSignature {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
}

const MONEY_RE = /^\d+\.\d{2}$/;

/** Deterministic idempotency key: the same action on the same transaction reuses the same id. */
export function requestIdFor(txId: string, action: string, attempt = 1): string {
  return `hv-${txId}-${action}-${attempt}`;
}

interface RequestOptions {
  body?: unknown;
  /** Multipart body (the browser-style FormData sets its own Content-Type). */
  form?: FormData;
  requestId?: string;
}

type Json = Record<string, any>;

export class PayPalClient {
  private token: { value: string; expiresAt: number } | null = null;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;

  constructor(private readonly config: PayPalConfig) {
    if (!config.clientId || !config.clientSecret) throw new Error('PayPal client id and secret are required');
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.now = config.now ?? Date.now;
  }

  private async accessToken(): Promise<string> {
    // Refresh one minute early so a token never expires in the middle of a request.
    if (this.token && this.now() < this.token.expiresAt - 60_000) return this.token.value;
    const basic = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    const res = await this.fetchImpl(`${this.config.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    const data = (await parseBody(res)) as Json | undefined;
    if (!res.ok || !data?.access_token) {
      throw new PayPalError(res.status, data?.error ?? 'AUTH_FAILED', undefined, undefined, data?.error_description ?? 'Could not get a PayPal access token');
    }
    this.token = { value: data.access_token, expiresAt: this.now() + Number(data.expires_in ?? 0) * 1000 };
    return this.token.value;
  }

  private async request(method: string, path: string, opts: RequestOptions = {}): Promise<Json | undefined> {
    const token = await this.accessToken();
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (!opts.form) headers['Content-Type'] = 'application/json';
    if (opts.requestId) headers['PayPal-Request-Id'] = opts.requestId;
    const res = await this.fetchImpl(`${this.config.baseUrl}${path}`, {
      method,
      headers,
      body: opts.form ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
    });
    const data = (await parseBody(res)) as Json | undefined;
    if (!res.ok) {
      throw new PayPalError(
        res.status,
        data?.name ?? 'HTTP_ERROR',
        data?.details?.[0]?.issue,
        data?.debug_id,
        data?.details?.[0]?.description ?? data?.message ?? `PayPal request failed with ${res.status}`,
      );
    }
    return data;
  }

  /** Create an order that only reserves funds (intent AUTHORIZE). Returns the URL the buyer must open. */
  async createAuthorizeOrder(args: { amount: Money; returnUrl: string; cancelUrl: string; requestId: string }) {
    assertMoney(args.amount);
    const data = await this.request('POST', '/v2/checkout/orders', {
      requestId: args.requestId,
      body: {
        intent: 'AUTHORIZE',
        purchase_units: [{ amount: { currency_code: args.amount.currency, value: args.amount.value } }],
        payment_source: {
          paypal: { experience_context: { return_url: args.returnUrl, cancel_url: args.cancelUrl, user_action: 'PAY_NOW' } },
        },
      },
    });
    const links: Json[] = data?.links ?? [];
    const approval = links.find((l) => l.rel === 'payer-action') ?? links.find((l) => l.rel === 'approve');
    if (!data?.id || !approval?.href) throw new Error('PayPal order response is missing the id or the approval link');
    return { orderId: String(data.id), status: String(data.status), approvalUrl: String(approval.href) };
  }

  async getOrderStatus(orderId: string): Promise<string> {
    const data = await this.request('GET', `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
    return String(data?.status);
  }

  /** Authorize an approved order. Fails with issue ORDER_NOT_APPROVED if the buyer has not approved. */
  async authorizeOrder(orderId: string, requestId: string) {
    const data = await this.request('POST', `/v2/checkout/orders/${encodeURIComponent(orderId)}/authorize`, { requestId, body: {} });
    const auth = data?.purchase_units?.[0]?.payments?.authorizations?.[0];
    if (!auth?.id) throw new Error('PayPal authorize response has no authorization');
    return { orderStatus: String(data?.status), authorizationId: String(auth.id), authorizationStatus: String(auth.status) };
  }

  async getAuthorizationStatus(authorizationId: string): Promise<string> {
    const data = await this.request('GET', `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}`);
    return String(data?.status);
  }

  /** Capture the full authorization. Fails with VOIDED or similar issues if it can no longer be captured. */
  async captureAuthorization(authorizationId: string, requestId: string) {
    const data = await this.request('POST', `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/capture`, {
      requestId,
      body: { final_capture: true },
    });
    return { captureId: String(data?.id), status: String(data?.status) };
  }

  /** Release the reservation. Fails with PREVIOUSLY_CAPTURED after a capture (then only refund works). */
  async voidAuthorization(authorizationId: string, requestId: string): Promise<void> {
    await this.request('POST', `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/void`, { requestId });
  }

  /** Refund a capture. Omit `amount` for a full refund. */
  async refundCapture(captureId: string, requestId: string, amount?: Money) {
    if (amount) assertMoney(amount);
    const body = amount ? { amount: { currency_code: amount.currency, value: amount.value } } : {};
    const data = await this.request('POST', `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, { requestId, body });
    return { refundId: String(data?.id), status: String(data?.status) };
  }

  /**
   * Attach shipment tracking to a captured order (Orders v2 `/track`). PayPal only accepts it
   * after capture. Unknown couriers use carrier OTHER plus a name. Idempotent per capture and
   * tracking number on PayPal's side; we also send a request id.
   */
  async addTracking(args: { orderId: string; captureId: string; trackingNumber: string; carrierName: string; requestId: string }) {
    const data = await this.request('POST', `/v2/checkout/orders/${encodeURIComponent(args.orderId)}/track`, {
      requestId: args.requestId,
      body: {
        capture_id: args.captureId,
        tracking_number: args.trackingNumber,
        carrier: 'OTHER',
        carrier_name_other: args.carrierName,
        notify_payer: false,
      },
    });
    const trackers: Json[] = data?.purchase_units?.[0]?.shipping?.trackers ?? [];
    const tracker = trackers.find((t) => String(t.id ?? '').endsWith(args.trackingNumber)) ?? trackers.at(-1);
    return { trackerId: tracker?.id ? String(tracker.id) : `${args.captureId}-${args.trackingNumber}` };
  }

  // ---- Disputes (Customer Disputes API v1). Merchant-side calls plus two Sandbox-only simulations.

  /** Disputes on this merchant account, optionally for one transaction (capture id). */
  async listDisputes(filter: { disputedTransactionId?: string; startTime?: string } = {}) {
    const q = new URLSearchParams();
    if (filter.disputedTransactionId) q.set('disputed_transaction_id', filter.disputedTransactionId);
    if (filter.startTime) q.set('start_time', filter.startTime);
    const data = await this.request('GET', `/v1/customer/disputes${q.size ? `?${q}` : ''}`);
    const items: Json[] = data?.items ?? [];
    return items.map((d) => ({
      id: String(d.dispute_id), reason: String(d.reason ?? ''), status: String(d.status ?? ''),
      stage: d.dispute_life_cycle_stage ? String(d.dispute_life_cycle_stage) : undefined,
      amount: toMoney(d.dispute_amount), createdAt: d.create_time ? String(d.create_time) : undefined,
    }));
  }

  /** One dispute with the actions PayPal currently allows (HATEOAS link rels). */
  async getDispute(disputeId: string) {
    const d = await this.request('GET', `/v1/customer/disputes/${encodeURIComponent(disputeId)}`);
    const tx: Json[] = d?.disputed_transactions ?? [];
    return {
      id: String(d?.dispute_id), reason: String(d?.reason ?? ''), status: String(d?.status ?? ''),
      stage: d?.dispute_life_cycle_stage ? String(d.dispute_life_cycle_stage) : undefined,
      outcome: d?.dispute_outcome?.outcome_code ? String(d.dispute_outcome.outcome_code) : undefined,
      sellerTransactionIds: tx.map((t) => String(t.seller_transaction_id ?? '')).filter(Boolean),
      actions: ((d?.links ?? []) as Json[]).map((l) => String(l.rel)).filter((rel) => rel !== 'self'),
    };
  }

  /**
   * Send the merchant's evidence. PayPal documents both a multipart body (a JSON "input" part plus
   * an "evidence-file") and a JSON body; this sends multipart when a file is given, else JSON.
   */
  async provideEvidence(disputeId: string, evidence: { notes: string; trackingNumber?: string; carrierName?: string; file?: { name: string; type: string; content: Uint8Array } }) {
    const input = {
      evidences: [{
        evidence_type: 'PROOF_OF_FULFILLMENT',
        ...(evidence.trackingNumber ? { evidence_info: { tracking_info: [{ carrier_name: 'OTHER', carrier_name_other: evidence.carrierName ?? 'Other', tracking_number: evidence.trackingNumber }] } } : {}),
        notes: evidence.notes,
      }],
    };
    const path = `/v1/customer/disputes/${encodeURIComponent(disputeId)}/provide-evidence`;
    if (!evidence.file) return this.request('POST', path, { body: input });
    const form = new FormData();
    form.append('input', new Blob([JSON.stringify(input)], { type: 'application/json' }));
    form.append('evidence-file', new Blob([new Uint8Array(evidence.file.content)], { type: evidence.file.type }), evidence.file.name);
    return this.request('POST', path, { form });
  }

  /** Message to the buyer on the dispute (available in the inquiry stage). */
  async sendDisputeMessage(disputeId: string, message: string) {
    return this.request('POST', `/v1/customer/disputes/${encodeURIComponent(disputeId)}/send-message`, { body: { message } });
  }

  /** Merchant escalates an inquiry to a PayPal claim, where evidence can be provided. */
  async escalateDispute(disputeId: string, note: string) {
    return this.request('POST', `/v1/customer/disputes/${encodeURIComponent(disputeId)}/escalate`, { body: { note } });
  }

  /** Sandbox only: move a dispute to waiting for seller (or buyer) evidence. */
  async sandboxRequireEvidence(disputeId: string, action: 'SELLER_EVIDENCE' | 'BUYER_EVIDENCE') {
    this.assertSandbox();
    return this.request('POST', `/v1/customer/disputes/${encodeURIComponent(disputeId)}/require-evidence`, { body: { action } });
  }

  /** Sandbox only: settle a dispute in the buyer's or the seller's favour. */
  async sandboxAdjudicate(disputeId: string, outcome: 'BUYER_FAVOR' | 'SELLER_FAVOR') {
    this.assertSandbox();
    return this.request('POST', `/v1/customer/disputes/${encodeURIComponent(disputeId)}/adjudicate`, { body: { adjudication_outcome: outcome } });
  }

  private assertSandbox(): void {
    if (!this.config.baseUrl.startsWith('https://api-m.sandbox.paypal.com')) throw new Error('This simulation exists only in the PayPal Sandbox');
  }

  /** Capture details including the fee breakdown (seen in the Sandbox: 10.00 gross, 0.64 fee, 9.36 net). */
  async getCapture(captureId: string) {
    const data = await this.request('GET', `/v2/payments/captures/${encodeURIComponent(captureId)}`);
    const b = data?.seller_receivable_breakdown;
    return {
      status: String(data?.status),
      gross: toMoney(b?.gross_amount),
      fee: toMoney(b?.paypal_fee),
      net: toMoney(b?.net_amount),
    };
  }

  /** Ask PayPal to verify the signed notification against this Sandbox webhook id. */
  async verifyWebhookSignature(webhookId: string, signature: WebhookSignature, webhookEvent: unknown): Promise<boolean> {
    if (!webhookId) throw new Error('PayPal webhook id is required');
    const data = await this.request('POST', '/v1/notifications/verify-webhook-signature', {
      body: {
        auth_algo: signature.authAlgo,
        cert_url: signature.certUrl,
        transmission_id: signature.transmissionId,
        transmission_sig: signature.transmissionSig,
        transmission_time: signature.transmissionTime,
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      },
    });
    return data?.verification_status === 'SUCCESS';
  }
}

async function parseBody(res: Response): Promise<unknown> {
  // Some calls (void) return 204 with no body.
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function assertMoney(m: Money): void {
  if (!MONEY_RE.test(m.value)) throw new Error(`Amount must be a string with two decimals, got "${m.value}"`);
  if (!/^[A-Z]{3}$/.test(m.currency)) throw new Error(`Invalid currency "${m.currency}"`);
}

function toMoney(x: Json | undefined): Money | null {
  return x?.value ? { currency: String(x.currency_code), value: String(x.value) } : null;
}
