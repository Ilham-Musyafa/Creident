import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { PayPalClient, PayPalError, requestIdFor } from '../src/lib/paypal/client.ts';

type Ask = (question: string) => Promise<string>;
type Log = (line: string) => void;

export function clientFromEnv(env: NodeJS.ProcessEnv = process.env): PayPalClient {
  const clientId = env.PP_ID?.trim();
  const clientSecret = env.PP_SECRET?.trim();
  const baseUrl = env.PP_URL?.trim();
  if (!clientId || !clientSecret || !baseUrl) {
    throw new Error('Set PP_ID, PP_SECRET, and PP_URL in .env before running the smoke test.');
  }
  const url = new URL(baseUrl);
  if (url.origin !== 'https://api-m.sandbox.paypal.com' || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PP_URL must be https://api-m.sandbox.paypal.com (Sandbox only).');
  }
  return new PayPalClient({ baseUrl: url.origin, clientId, clientSecret });
}

function money(value: { currency: string; value: string } | null): string {
  return value ? `${value.value} ${value.currency}` : 'not returned by PayPal';
}

export async function runSandboxSmoke(client: PayPalClient, ask: Ask, log: Log, runId: string = randomUUID()): Promise<void> {
  log('Creating a 10.00 USD AUTHORIZE order in PayPal Sandbox...');
  const order = await client.createAuthorizeOrder({
    amount: { currency: 'USD', value: '10.00' },
    returnUrl: 'https://example.com/',
    cancelUrl: 'https://example.com/',
    requestId: requestIdFor(runId, 'create-order'),
  });
  log(`Order: ${order.status}`);
  log(`Approval URL: ${order.approvalUrl}`);
  log('Open the approval URL in your browser. Log in with your Sandbox Personal account and click the purchase/confirm button.');
  await ask('After approval, return here and press Enter to continue: ');

  const orderStatus = await client.getOrderStatus(order.orderId);
  if (orderStatus !== 'APPROVED') {
    throw new Error(`Order is ${orderStatus}, not APPROVED. Complete buyer approval before authorizing.`);
  }
  log('Order: APPROVED');
  const authorization = await client.authorizeOrder(order.orderId, requestIdFor(runId, 'authorize'));
  log(`Authorization: ${authorization.authorizationStatus}`);

  let choice: string;
  do {
    choice = (await ask('Choose a) void or b) capture then refund [a/b]: ')).trim().toLowerCase();
    if (choice !== 'a' && choice !== 'b') log('Enter a or b.');
  } while (choice !== 'a' && choice !== 'b');

  if (choice === 'a') {
    await client.voidAuthorization(authorization.authorizationId, requestIdFor(runId, 'void'));
    const status = await client.getAuthorizationStatus(authorization.authorizationId);
    if (status !== 'VOIDED') throw new Error(`Void was requested, but authorization status is ${status}.`);
    log('Authorization: VOIDED (confirmed).');
    return;
  }

  const capture = await client.captureAuthorization(authorization.authorizationId, requestIdFor(runId, 'capture'));
  if (capture.status !== 'COMPLETED') throw new Error(`Capture status is ${capture.status}, not COMPLETED.`);
  log('Capture: COMPLETED');
  try {
    const details = await client.getCapture(capture.captureId);
    log(`Fee breakdown: gross ${money(details.gross)}, fee ${money(details.fee)}, net ${money(details.net)}.`);
  } catch {
    log('Fee breakdown could not be read; attempting the full refund anyway.');
  }
  // The app sends the seller's tracking number to PayPal right after capture. Check that the
  // Sandbox accepts a made-up number with carrier OTHER. A rejection is reported, not fatal.
  try {
    const tracking = await client.addTracking({
      orderId: order.orderId, captureId: capture.captureId, trackingNumber: `HV-SMOKE-${runId.slice(0, 8)}`,
      carrierName: 'Creident demo courier', requestId: requestIdFor(runId, 'add-tracking'),
    });
    log(`Tracking: added to the PayPal order (tracker ${tracking.trackerId}).`);
  } catch (error) {
    log(`Tracking: rejected by PayPal (${error instanceof Error ? error.message : String(error)}). Refunding anyway.`);
  }
  const refund = await client.refundCapture(capture.captureId, requestIdFor(runId, 'refund'));
  if (refund.status !== 'COMPLETED') throw new Error(`Refund status is ${refund.status}, not COMPLETED.`);
  log('Refund: COMPLETED (confirmed).');
}

async function main(): Promise<void> {
  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    await runSandboxSmoke(clientFromEnv(), (question) => input.question(question), console.log);
  } catch (error) {
    if (error instanceof PayPalError) {
      console.error(`PayPal error: ${error.issue ?? error.code} (HTTP ${error.status}${error.debugId ? `, debug_id ${error.debugId}` : ''}).`);
    } else {
      console.error(error instanceof Error ? error.message : 'Smoke test failed.');
    }
    process.exitCode = 1;
  } finally {
    input.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  void main();
}
