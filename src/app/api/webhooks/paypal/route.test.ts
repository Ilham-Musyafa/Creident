import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../../../../lib/db';
import { PayPalClient } from '../../../../lib/paypal/client';
import { TransactionRepository, type StoredTx } from '../../../../lib/repository';
import { seedDemoUsers, setApiContextForTests } from '../../_shared/context';
import { POST } from './route';

let db: DatabaseSync;
let repo: TransactionRepository;
let verificationStatus: string;
let verificationCalls: unknown[];
let previousWebhookId: string | undefined;

function webhook(event: Record<string, unknown>, signed = true): Request {
  return new Request('http://localhost:3000/api/webhooks/paypal', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(signed ? {
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-cert-url': 'https://api-m.sandbox.paypal.com/cert',
        'paypal-transmission-id': 'sample-transmission',
        'paypal-transmission-sig': 'sample-signature',
        'paypal-transmission-time': '2026-10-20T00:00:00Z',
      } : {}),
    },
    body: JSON.stringify(event),
  });
}

function event(id: string, type: string, resource: Record<string, unknown>): Record<string, unknown> {
  return { id, event_type: type, resource };
}

function transaction(status: StoredTx['status'] = 'AUTHORIZED'): string {
  const id = randomUUID();
  repo.insertTransaction({
    id, status, captured: status === 'COMPLETED', buyerId: 'buyer', sellerId: 'seller',
    item: 'Sample item', amount: '10.00', currency: 'USD', termsJson: '{}',
    paypalOrderId: 'order-1', paypalAuthId: 'auth-1', paypalCaptureId: status === 'COMPLETED' ? 'capture-1' : undefined,
  });
  return id;
}

beforeEach(() => {
  db = openDatabase(':memory:');
  seedDemoUsers(db);
  repo = new TransactionRepository(db);
  verificationStatus = 'SUCCESS';
  verificationCalls = [];
  previousWebhookId = process.env.PP_WEBHOOK_ID;
  process.env.PP_WEBHOOK_ID = 'sandbox-webhook-id';
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(input)).pathname;
    if (path === '/v1/oauth2/token') return Response.json({ access_token: 'fake-token', expires_in: 3600 });
    if (path === '/v1/notifications/verify-webhook-signature') {
      verificationCalls.push(JSON.parse(String(init?.body)));
      return Response.json({ verification_status: verificationStatus });
    }
    throw new Error(`Unexpected PayPal request: ${path}`);
  }) as typeof fetch;
  setApiContextForTests({
    db, repo, now: () => '2026-10-20T00:00:00.000Z',
    time: { shipByDays: 3, inspectionDays: 2, evidenceDays: 2 },
    paypal: new PayPalClient({ baseUrl: 'https://api-m.sandbox.paypal.com', clientId: 'fake', clientSecret: 'fake', fetchImpl }),
  });
});

afterEach(() => {
  setApiContextForTests(null);
  if (previousWebhookId === undefined) delete process.env.PP_WEBHOOK_ID;
  else process.env.PP_WEBHOOK_ID = previousWebhookId;
  db.close();
});

describe('PayPal webhook route', () => {
  it('verifies each event with PayPal, freezes a matching order, and ignores a duplicate', async () => {
    const txId = transaction();
    const payload = event('event-created', 'CUSTOMER.DISPUTE.CREATED', {
      id: 'dispute-1', supplementary_data: { related_ids: { order_id: 'order-1' } },
    });
    const first = await POST(webhook(payload));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ duplicate: false, txId, status: 'FROZEN_EXTERNAL' });
    expect(repo.loadTransaction(txId)).toMatchObject({ status: 'FROZEN_EXTERNAL', frozenFrom: 'AUTHORIZED' });
    expect(verificationCalls[0]).toMatchObject({
      webhook_id: 'sandbox-webhook-id', transmission_id: 'sample-transmission', webhook_event: payload,
    });
    const second = await POST(webhook(payload));
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ duplicate: true });
    expect(verificationCalls).toHaveLength(2);
    expect(repo.readEvents(txId)).toHaveLength(1);
    expect(db.prepare('SELECT COUNT(*) AS count FROM paypal_events').get()?.count).toBe(1);
  });

  it('rejects an invalid signature without writing an event or changing status', async () => {
    const txId = transaction();
    verificationStatus = 'FAILURE';
    const response = await POST(webhook(event('invalid', 'CUSTOMER.DISPUTE.CREATED', {
      supplementary_data: { related_ids: { authorization_id: 'auth-1' } },
    })));
    expect(response.status).toBe(401);
    expect(repo.loadTransaction(txId)?.status).toBe('AUTHORIZED');
    expect(db.prepare('SELECT COUNT(*) AS count FROM paypal_events').get()?.count).toBe(0);
    expect(repo.readEvents(txId)).toHaveLength(0);
  });

  it('rejects missing signature headers before contacting PayPal', async () => {
    transaction();
    const response = await POST(webhook(event('unsigned', 'PAYMENT.CAPTURE.REVERSED', { id: 'capture-1' }), false));
    expect(response.status).toBe(400);
    expect(verificationCalls).toHaveLength(0);
  });

  it('freezes a completed capture reversal, then resumes using its dispute id', async () => {
    const txId = transaction('COMPLETED');
    const reversed = await POST(webhook(event('reversal', 'PAYMENT.CAPTURE.REVERSED', { id: 'capture-1' })));
    expect(reversed.status).toBe(200);
    expect(repo.loadTransaction(txId)).toMatchObject({ status: 'FROZEN_EXTERNAL', frozenFrom: 'COMPLETED' });
    const created = await POST(webhook(event('dispute-created', 'CUSTOMER.DISPUTE.CREATED', {
      id: 'dispute-1', disputed_transactions: [{ seller_transaction_id: 'capture-1' }],
    })));
    expect(created.status).toBe(200);
    const resolved = await POST(webhook(event('dispute-resolved', 'CUSTOMER.DISPUTE.RESOLVED', { id: 'dispute-1' })));
    expect(resolved.status).toBe(200);
    expect(repo.loadTransaction(txId)).toMatchObject({ status: 'COMPLETED', captured: true });
    expect(repo.readEvents(txId)).toHaveLength(3);
  });

  it('records other verified events in the audit log without changing status', async () => {
    const txId = transaction();
    const response = await POST(webhook(event('other', 'PAYMENT.AUTHORIZATION.CREATED', { id: 'auth-1' })));
    expect(response.status).toBe(200);
    expect(repo.loadTransaction(txId)?.status).toBe('AUTHORIZED');
    expect(repo.readEvents(txId)[0]).toMatchObject({ type: 'PAYPAL_WEBHOOK', payload: { eventId: 'other' } });
  });
});
