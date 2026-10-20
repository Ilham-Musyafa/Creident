import { describe, expect, it } from 'vitest';
import { PayPalClient, PayPalError, requestIdFor } from './client';

// Fake fetch that answers from a queue and records each call. No network is used.
type Reply = { status: number; body?: unknown };

function fakeFetch(replies: Reply[]) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const r = replies.shift();
    if (!r) throw new Error(`Unexpected request to ${String(url)}`);
    const text = r.body === undefined ? '' : JSON.stringify(r.body);
    return new Response(text || null, { status: r.status });
  }) as typeof fetch;
  return { impl, calls };
}

const TOKEN: Reply = { status: 200, body: { access_token: 'tok', expires_in: 32400 } };

function client(replies: Reply[], now = () => 0) {
  const f = fakeFetch(replies);
  const c = new PayPalClient({ baseUrl: 'https://api-m.sandbox.paypal.com', clientId: 'id', clientSecret: 'secret', fetchImpl: f.impl, now });
  return { c, calls: f.calls };
}

const header = (init: RequestInit, name: string) => (init.headers as Record<string, string>)[name];

describe('auth', () => {
  it('requests a token with basic auth and reuses it until close to expiry', async () => {
    let t = 0;
    const { c, calls } = client(
      [TOKEN, { status: 200, body: { status: 'CREATED' } }, { status: 200, body: { status: 'CREATED' } }, TOKEN, { status: 200, body: { status: 'CREATED' } }],
      () => t,
    );
    await c.getAuthorizationStatus('A1');
    await c.getAuthorizationStatus('A1');
    expect(calls.filter((x) => x.url.endsWith('/v1/oauth2/token'))).toHaveLength(1);
    expect(header(calls[0]!.init, 'Authorization')).toBe(`Basic ${Buffer.from('id:secret').toString('base64')}`);
    t = 32400 * 1000 - 30_000; // inside the one-minute refresh margin
    await c.getAuthorizationStatus('A1');
    expect(calls.filter((x) => x.url.endsWith('/v1/oauth2/token'))).toHaveLength(2);
  });

  it('reports a failed token request as a PayPalError', async () => {
    const { c } = client([{ status: 401, body: { error: 'invalid_client', error_description: 'Client Authentication failed' } }]);
    await expect(c.getAuthorizationStatus('A1')).rejects.toMatchObject({ status: 401, code: 'invalid_client' });
  });

  it('refuses to start without credentials', () => {
    expect(() => new PayPalClient({ baseUrl: 'x', clientId: '', clientSecret: '' })).toThrow();
  });
});

describe('orders', () => {
  it('creates an AUTHORIZE order with an idempotency key and returns the approval link', async () => {
    const { c, calls } = client([
      TOKEN,
      {
        status: 200,
        body: {
          id: 'O1',
          status: 'PAYER_ACTION_REQUIRED',
          links: [
            { rel: 'self', href: 'https://api/self' },
            { rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=O1' },
          ],
        },
      },
    ]);
    const r = await c.createAuthorizeOrder({
      amount: { currency: 'USD', value: '10.00' },
      returnUrl: 'https://example.com/ok',
      cancelUrl: 'https://example.com/cancel',
      requestId: requestIdFor('tx1', 'create-order'),
    });
    expect(r).toEqual({ orderId: 'O1', status: 'PAYER_ACTION_REQUIRED', approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=O1' });
    const call = calls[1]!;
    expect(call.url).toBe('https://api-m.sandbox.paypal.com/v2/checkout/orders');
    expect(header(call.init, 'PayPal-Request-Id')).toBe('hv-tx1-create-order-1');
    expect(JSON.parse(String(call.init.body))).toMatchObject({
      intent: 'AUTHORIZE',
      purchase_units: [{ amount: { currency_code: 'USD', value: '10.00' } }],
    });
  });

  it('rejects amounts that are not two-decimal strings before calling PayPal', async () => {
    const { c, calls } = client([]);
    await expect(
      c.createAuthorizeOrder({ amount: { currency: 'USD', value: '10' }, returnUrl: 'a', cancelUrl: 'b', requestId: 'r' }),
    ).rejects.toThrow(/two decimals/);
    expect(calls).toHaveLength(0);
  });

  it('surfaces ORDER_NOT_APPROVED as an issue code', async () => {
    const { c } = client([
      TOKEN,
      {
        status: 422,
        body: { name: 'UNPROCESSABLE_ENTITY', debug_id: 'dbg1', details: [{ issue: 'ORDER_NOT_APPROVED', description: 'Payer has not yet approved the Order for payment.' }] },
      },
    ]);
    const err = await c.authorizeOrder('O1', 'r').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PayPalError);
    expect(err).toMatchObject({ status: 422, code: 'UNPROCESSABLE_ENTITY', issue: 'ORDER_NOT_APPROVED', debugId: 'dbg1' });
  });

  it('reads the authorization id from an authorize response', async () => {
    const { c } = client([
      TOKEN,
      { status: 201, body: { status: 'COMPLETED', purchase_units: [{ payments: { authorizations: [{ id: 'A1', status: 'CREATED' }] } }] } },
    ]);
    expect(await c.authorizeOrder('O1', 'r')).toEqual({ orderStatus: 'COMPLETED', authorizationId: 'A1', authorizationStatus: 'CREATED' });
  });
});

describe('payments', () => {
  it('captures with final_capture and an idempotency key', async () => {
    const { c, calls } = client([TOKEN, { status: 201, body: { id: 'C1', status: 'COMPLETED' } }]);
    expect(await c.captureAuthorization('A1', 'hv-tx1-capture-1')).toEqual({ captureId: 'C1', status: 'COMPLETED' });
    expect(calls[1]!.url).toBe('https://api-m.sandbox.paypal.com/v2/payments/authorizations/A1/capture');
    expect(JSON.parse(String(calls[1]!.init.body))).toEqual({ final_capture: true });
  });

  it('handles the empty 204 response of void', async () => {
    const { c, calls } = client([TOKEN, { status: 204 }]);
    await expect(c.voidAuthorization('A1', 'hv-tx1-void-1')).resolves.toBeUndefined();
    expect(header(calls[1]!.init, 'PayPal-Request-Id')).toBe('hv-tx1-void-1');
  });

  it('surfaces PREVIOUSLY_CAPTURED when voiding a captured authorization', async () => {
    const { c } = client([
      TOKEN,
      { status: 422, body: { name: 'UNPROCESSABLE_ENTITY', details: [{ issue: 'PREVIOUSLY_CAPTURED' }] } },
    ]);
    await expect(c.voidAuthorization('A1', 'r')).rejects.toMatchObject({ issue: 'PREVIOUSLY_CAPTURED' });
  });

  it('sends an empty body for a full refund and an amount for a partial refund', async () => {
    const { c, calls } = client([
      TOKEN,
      { status: 201, body: { id: 'R1', status: 'COMPLETED' } },
      { status: 201, body: { id: 'R2', status: 'COMPLETED' } },
    ]);
    await c.refundCapture('C1', 'r1');
    await c.refundCapture('C1', 'r2', { currency: 'USD', value: '2.50' });
    expect(JSON.parse(String(calls[1]!.init.body))).toEqual({});
    expect(JSON.parse(String(calls[2]!.init.body))).toEqual({ amount: { currency_code: 'USD', value: '2.50' } });
  });

  it('reads the fee breakdown of a capture', async () => {
    const { c } = client([
      TOKEN,
      {
        status: 200,
        body: {
          status: 'COMPLETED',
          seller_receivable_breakdown: {
            gross_amount: { currency_code: 'USD', value: '10.00' },
            paypal_fee: { currency_code: 'USD', value: '0.64' },
            net_amount: { currency_code: 'USD', value: '9.36' },
          },
        },
      },
    ]);
    expect(await c.getCapture('C1')).toEqual({
      status: 'COMPLETED',
      gross: { currency: 'USD', value: '10.00' },
      fee: { currency: 'USD', value: '0.64' },
      net: { currency: 'USD', value: '9.36' },
    });
  });
});

it('derives stable idempotency keys', () => {
  expect(requestIdFor('tx9', 'capture')).toBe('hv-tx9-capture-1');
  expect(requestIdFor('tx9', 'refund', 2)).toBe('hv-tx9-refund-2');
});
