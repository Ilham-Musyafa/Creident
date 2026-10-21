import { describe, expect, it } from 'vitest';
import { PayPalClient } from '../src/lib/paypal/client';
import { resumeDisputeProbe, runDisputeProbe } from './dispute-probe';

function fakePayPal(opts: { rejectMultipart?: boolean } = {}) {
  const calls: Array<{ method: string; path: string; body: unknown; contentType: string | null }> = [];
  let status = 'WAITING_FOR_SELLER_RESPONSE';
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ method, path: url.pathname + url.search, body: init?.body, contentType: headers['Content-Type'] ?? null });
    const ok = (body: unknown, code = 200) => new Response(JSON.stringify(body), { status: code });
    const p = url.pathname;
    if (p === '/v1/oauth2/token') return ok({ access_token: 't', expires_in: 3600 });
    if (p === '/v2/checkout/orders' && method === 'POST') return ok({ id: 'O1', status: 'PAYER_ACTION_REQUIRED', links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/x' }] }, 201);
    if (p === '/v2/checkout/orders/O1' && method === 'GET') return ok({ status: 'APPROVED' });
    if (p === '/v2/checkout/orders/O1/authorize') return ok({ status: 'COMPLETED', purchase_units: [{ payments: { authorizations: [{ id: 'A1', status: 'CREATED' }] } }] }, 201);
    if (p === '/v2/payments/authorizations/A1/capture') return ok({ id: 'C1', status: 'COMPLETED' }, 201);
    if (p === '/v2/checkout/orders/O1/track') return ok({ purchase_units: [{ shipping: { trackers: [{ id: 'C1-T' }] } }] }, 201);
    if (p === '/v1/customer/disputes' && url.searchParams.get('disputed_transaction_id') === 'C1') return ok({ items: [{ dispute_id: 'PP-D-1', reason: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED', status, dispute_amount: { currency_code: 'USD', value: '10.00' } }] });
    if (p === '/v1/customer/disputes/PP-D-1' && method === 'GET') return ok({ dispute_id: 'PP-D-1', reason: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED', status, links: [{ rel: 'self' }, { rel: 'provide_evidence' }, { rel: 'adjudicate' }] });
    if (p === '/v1/customer/disputes/PP-D-1/provide-evidence') {
      if (opts.rejectMultipart && init?.body instanceof FormData) return ok({ name: 'INVALID_REQUEST', details: [{ issue: 'INVALID_EVIDENCE_FILE' }] }, 400);
      return ok({ links: [] });
    }
    if (p === '/v1/customer/disputes/PP-D-1/adjudicate') { status = 'RESOLVED'; return ok({ links: [] }); }
    throw new Error(`Unexpected ${method} ${p}`);
  }) as typeof fetch;
  return { client: new PayPalClient({ baseUrl: 'https://api-m.sandbox.paypal.com', clientId: 'id', clientSecret: 's', fetchImpl }), calls };
}

const answers = (...a: string[]) => async () => a.shift() ?? '';

describe('dispute probe', () => {
  it('finds the dispute, sends a PDF as multipart evidence and adjudicates in the Sandbox', async () => {
    const { client, calls } = fakePayPal();
    const lines: string[] = [];
    await runDisputeProbe(client, answers('', '', 'b'), (l) => lines.push(l), 'run-1');
    const evidence = calls.find((c) => c.path.endsWith('/provide-evidence'))!;
    expect(evidence.body).toBeInstanceOf(FormData);
    expect(evidence.contentType).toBeNull();
    const form = evidence.body as FormData;
    expect(JSON.parse(await (form.get('input') as Blob).text()).evidences[0]).toMatchObject({ evidence_type: 'PROOF_OF_FULFILLMENT' });
    expect((form.get('evidence-file') as File).name).toBe('halcyvault-evidence.pdf');
    expect(lines).toContain('Evidence (multipart with PDF): accepted.');
    expect(lines.some((l) => l.includes('status RESOLVED'))).toBe(true);
    expect(calls.some((c) => c.path.includes('/refund'))).toBe(false);
  });

  it('falls back to JSON evidence when the file is refused', async () => {
    const { client, calls } = fakePayPal({ rejectMultipart: true });
    const lines: string[] = [];
    await runDisputeProbe(client, answers('', '', 'n'), (l) => lines.push(l), 'run-2');
    expect(lines.some((l) => l.startsWith('Evidence (multipart with PDF): rejected'))).toBe(true);
    expect(lines).toContain('Evidence (JSON notes and tracking): accepted.');
    const json = calls.filter((c) => c.path.endsWith('/provide-evidence')).at(-1)!;
    expect(json.contentType).toBe('application/json');
  });

  it('refuses Sandbox-only simulations against any other host', async () => {
    const client = new PayPalClient({ baseUrl: 'https://api-m.paypal.com', clientId: 'id', clientSecret: 's', fetchImpl: (async () => new Response('{}')) as typeof fetch });
    await expect(client.sandboxAdjudicate('X', 'BUYER_FAVOR')).rejects.toThrow(/only in the PayPal Sandbox/);
  });
});

describe('dispute probe resume', () => {
  it('tries the Sandbox require-evidence step before sending evidence to an existing dispute', async () => {
    const { client, calls } = fakePayPal();
    const lines: string[] = [];
    await resumeDisputeProbe(client, answers('n'), (l) => lines.push(l), 'PP-D-1');
    expect(calls.some((c) => c.path.endsWith('/provide-evidence'))).toBe(true);
    expect(lines).toContain('Evidence (multipart with PDF): accepted.');
  });
});
