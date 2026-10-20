import { describe, expect, it } from 'vitest';
import { PayPalClient } from '../src/lib/paypal/client';
import { clientFromEnv, runSandboxSmoke } from './sandbox-smoke';

type Reply = { status: number; body?: unknown };

function fixture(replies: Reply[], answers: string[]) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const reply = replies.shift();
    if (!reply) throw new Error(`Unexpected call to ${String(url)}`);
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), { status: reply.status });
  }) as typeof fetch;
  const client = new PayPalClient({
    baseUrl: 'https://api-m.sandbox.paypal.com', clientId: 'fake-id',
    clientSecret: 'fake-secret', fetchImpl,
  });
  const lines: string[] = [];
  const prompts: string[] = [];
  const ask = async (question: string) => {
    prompts.push(question);
    const answer = answers.shift();
    if (answer === undefined) throw new Error('Unexpected prompt');
    return answer;
  };
  return { client, calls, lines, prompts, ask, log: (line: string) => lines.push(line) };
}

const token: Reply = { status: 200, body: { access_token: 'fake-access-token', expires_in: 32400 } };
const order: Reply = { status: 201, body: {
  id: 'order-1', status: 'PAYER_ACTION_REQUIRED',
  links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=order-1' }],
} };
const approved: Reply = { status: 200, body: { status: 'APPROVED' } };
const authorized: Reply = { status: 201, body: {
  status: 'COMPLETED', purchase_units: [{ payments: { authorizations: [{ id: 'auth-1', status: 'CREATED' }] } }],
} };

describe('Sandbox smoke script with fake fetch', () => {
  it('approves, authorizes, voids, and confirms VOIDED', async () => {
    const f = fixture([token, order, approved, authorized, { status: 204 }, { status: 200, body: { status: 'VOIDED' } }], ['', 'a']);
    await runSandboxSmoke(f.client, f.ask, f.log, 'test-run');
    expect(f.lines).toContain('Authorization: VOIDED (confirmed).');
    expect(f.lines.join(' ')).toContain('Sandbox Personal account and click the purchase/confirm button');
    expect(f.prompts[0]).toContain('press Enter');
    expect(f.calls.map((call) => new URL(call.url).pathname)).toEqual([
      '/v1/oauth2/token', '/v2/checkout/orders', '/v2/checkout/orders/order-1',
      '/v2/checkout/orders/order-1/authorize', '/v2/payments/authorizations/auth-1/void',
      '/v2/payments/authorizations/auth-1',
    ]);
    const writeIds = f.calls.map(({ init }) => (init.headers as Record<string, string>)?.['PayPal-Request-Id']).filter(Boolean);
    expect(new Set(writeIds).size).toBe(3);
    expect(f.lines.join(' ')).not.toMatch(/fake-secret|fake-access-token/);
  });

  it('captures, prints fees, refunds, and confirms COMPLETED', async () => {
    const f = fixture([
      token, order, approved, authorized,
      { status: 201, body: { id: 'capture-1', status: 'COMPLETED' } },
      { status: 200, body: { status: 'COMPLETED', seller_receivable_breakdown: {
        gross_amount: { currency_code: 'USD', value: '10.00' },
        paypal_fee: { currency_code: 'USD', value: '0.64' },
        net_amount: { currency_code: 'USD', value: '9.36' },
      } } },
      { status: 201, body: { id: 'refund-1', status: 'COMPLETED' } },
    ], ['', 'b']);
    await runSandboxSmoke(f.client, f.ask, f.log, 'test-run-2');
    expect(f.lines).toContain('Fee breakdown: gross 10.00 USD, fee 0.64 USD, net 9.36 USD.');
    expect(f.lines).toContain('Refund: COMPLETED (confirmed).');
    expect(f.calls.at(-1)?.url).toContain('/v2/payments/captures/capture-1/refund');
    const writeIds = f.calls.map(({ init }) => (init.headers as Record<string, string>)?.['PayPal-Request-Id']).filter(Boolean);
    expect(new Set(writeIds).size).toBe(4);
  });

  it('does not authorize an order that the buyer has not approved', async () => {
    const f = fixture([token, order, { status: 200, body: { status: 'PAYER_ACTION_REQUIRED' } }], ['']);
    await expect(runSandboxSmoke(f.client, f.ask, f.log)).rejects.toThrow('not APPROVED');
    expect(f.calls).toHaveLength(3);
  });

  it('rejects missing credentials and Live URLs before any request', () => {
    expect(() => clientFromEnv({ PP_ID: '', PP_SECRET: '', PP_URL: '' } as unknown as NodeJS.ProcessEnv)).toThrow('Set PP_ID');
    expect(() => clientFromEnv({ PP_ID: 'id', PP_SECRET: 'secret', PP_URL: 'https://api-m.paypal.com' } as unknown as NodeJS.ProcessEnv)).toThrow('Sandbox only');
  });
});
