// Owner-run Sandbox probe for the PayPal Disputes API (`npm run dispute-probe`).
// It answers what the docs leave open before the app integrates disputes:
//   1. can this Sandbox app read disputes on its own payments,
//   2. which actions PayPal offers at each stage,
//   3. which evidence format PayPal accepts (multipart file or JSON notes),
//   4. how the Sandbox-only simulations (require-evidence, adjudicate) behave.
// Creating a dispute through the API needs a scope only PayPal can grant, so the owner opens it
// by hand as the Sandbox buyer. Nothing here uses Live credentials.

import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { PayPalClient, PayPalError, requestIdFor } from '../src/lib/paypal/client.ts';
import { textPdf } from '../src/lib/evidencePdf.ts';
import { clientFromEnv } from './sandbox-smoke.ts';

type Ask = (question: string) => Promise<string>;
type Log = (line: string) => void;

function describe(error: unknown): string {
  if (error instanceof PayPalError) return `${error.code}${error.issue ? `/${error.issue}` : ''} (HTTP ${error.status}${error.debugId ? `, debug_id ${error.debugId}` : ''}): ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}

async function showDispute(client: PayPalClient, id: string, log: Log) {
  const d = await client.getDispute(id);
  log(`Dispute ${d.id}: status ${d.status}, stage ${d.stage ?? 'n/a'}, reason ${d.reason}${d.outcome ? `, outcome ${d.outcome}` : ''}`);
  log(`  Actions PayPal offers now: ${d.actions.length ? d.actions.join(', ') : 'none'}`);
  return d;
}

export async function runDisputeProbe(client: PayPalClient, ask: Ask, log: Log, runId: string = randomUUID(), wait = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<void> {
  const startedAt = new Date(Date.now() - 60_000).toISOString();

  // Step 1: a captured payment the buyer can dispute (kept captured on purpose).
  log('Step 1/6: creating and capturing a 10.00 USD Sandbox payment to dispute...');
  const order = await client.createAuthorizeOrder({
    amount: { currency: 'USD', value: '10.00' }, returnUrl: 'https://example.com/', cancelUrl: 'https://example.com/',
    requestId: requestIdFor(runId, 'create-order'),
  });
  log(`Approval URL: ${order.approvalUrl}`);
  log('Open it in a private window, log in with the Sandbox PERSONAL account, and approve.');
  await ask('Press Enter after approving: ');
  if (await client.getOrderStatus(order.orderId) !== 'APPROVED') throw new Error('The order is not APPROVED yet. Approve it with the Personal account and run again.');
  const auth = await client.authorizeOrder(order.orderId, requestIdFor(runId, 'authorize'));
  const capture = await client.captureAuthorization(auth.authorizationId, requestIdFor(runId, 'capture'));
  log(`Captured: ${capture.status}. Seller transaction (capture) id: ${capture.captureId}`);
  try {
    await client.addTracking({ orderId: order.orderId, captureId: capture.captureId, trackingNumber: `HV-PROBE-${runId.slice(0, 8)}`, carrierName: 'HalcyVault demo courier', requestId: requestIdFor(runId, 'add-tracking') });
    log('Tracking added to the order.');
  } catch (error) { log(`Tracking not added: ${describe(error)}`); }

  // Step 2: the owner opens the dispute as the buyer.
  log('');
  log('Step 2/6: open a dispute as the BUYER (by hand):');
  log('  - In the same private window go to https://www.sandbox.paypal.com/resolutioncenter (logged in as the Personal account).');
  log('  - Report a problem with the 10.00 USD payment just made; choose "item is significantly not as described" (or "not received").');
  log('  - Submit, then come back here. PayPal can take a few minutes before the dispute is visible.');

  // Step 3: find it through the API.
  let disputeId = '';
  for (let attempt = 1; !disputeId; attempt++) {
    const answer = (await ask(attempt === 1 ? 'Press Enter after submitting the dispute (or type skip): ' : 'Press Enter to look again (or type skip): ')).trim().toLowerCase();
    if (answer === 'skip') { log('Skipped: no dispute to test. The captured payment stays in the Sandbox.'); return; }
    try {
      const mine = await client.listDisputes({ disputedTransactionId: capture.captureId });
      const recent = mine.length ? mine : await client.listDisputes({ startTime: startedAt });
      log(`Step 3/6: list disputes -> ${recent.length} found${mine.length ? ' for this capture' : ' since the run started'}.`);
      for (const d of recent) log(`  ${d.id}: ${d.status}, ${d.reason}, ${d.amount ? `${d.amount.value} ${d.amount.currency}` : ''}`);
      disputeId = recent[0]?.id ?? '';
      if (!disputeId) { log('  Not visible yet. Wait a minute and try again.'); await wait(0); }
    } catch (error) {
      log(`  Listing disputes failed: ${describe(error)}`);
      log('  If this is NOT_AUTHORIZED or PERMISSION_DENIED, the Sandbox app may need the disputes feature enabled (developer.paypal.com > Apps & Credentials > your app > Features).');
    }
  }

  // Step 4: what PayPal allows now.
  log('');
  log('Step 4/6: dispute details');
  let d = await showDispute(client, disputeId, log);
  if (!d.actions.includes('provide_evidence') && d.actions.includes('require_evidence')) {
    try {
      await client.sandboxRequireEvidence(disputeId, 'SELLER_EVIDENCE');
      log('Sandbox simulation: asked PayPal to require seller evidence.');
      d = await showDispute(client, disputeId, log);
    } catch (error) { log(`require-evidence failed: ${describe(error)}`); }
  }

  // Step 5: send evidence, first as a PDF file, then as JSON notes if the file is refused.
  log('');
  log('Step 5/6: sending evidence from HalcyVault...');
  const notes = `HalcyVault deal evidence: terms locked before payment; shipped with tracking HV-PROBE-${runId.slice(0, 8)}; full audit log available. Synthetic Sandbox test.`;
  const pdf = textPdf([
    'HalcyVault - evidence for PayPal dispute (Sandbox test)', '',
    `PayPal order: ${order.orderId}`, `Capture: ${capture.captureId}`, `Tracking: HV-PROBE-${runId.slice(0, 8)} (simulated courier)`, '',
    'Locked terms, evidence hashes and the hash-chained audit log are kept by HalcyVault.',
    'This is a synthetic test document. No real person or goods are involved.',
  ]);
  if (d.actions.includes('send_message')) {
    try { await client.sendDisputeMessage(disputeId, notes); log('Message to buyer: sent.'); }
    catch (error) { log(`Message to buyer failed: ${describe(error)}`); }
  }
  try {
    await client.provideEvidence(disputeId, { notes, trackingNumber: `HV-PROBE-${runId.slice(0, 8)}`, carrierName: 'HalcyVault demo courier', file: { name: 'halcyvault-evidence.pdf', type: 'application/pdf', content: pdf } });
    log('Evidence (multipart with PDF): accepted.');
  } catch (error) {
    log(`Evidence (multipart with PDF): rejected: ${describe(error)}`);
    try {
      await client.provideEvidence(disputeId, { notes, trackingNumber: `HV-PROBE-${runId.slice(0, 8)}`, carrierName: 'HalcyVault demo courier' });
      log('Evidence (JSON notes and tracking): accepted.');
    } catch (error2) { log(`Evidence (JSON notes and tracking): rejected: ${describe(error2)}`); }
  }
  d = await showDispute(client, disputeId, log);

  // Step 6: let the Sandbox decide.
  log('');
  const choice = (await ask('Step 6/6: simulate PayPal\'s decision? b) buyer wins  s) seller wins  n) leave open [b/s/n]: ')).trim().toLowerCase();
  if (choice === 'b' || choice === 's') {
    try {
      await client.sandboxAdjudicate(disputeId, choice === 'b' ? 'BUYER_FAVOR' : 'SELLER_FAVOR');
      log(`Sandbox simulation: adjudicated in the ${choice === 'b' ? 'buyer' : 'seller'}'s favour.`);
    } catch (error) { log(`adjudicate failed: ${describe(error)} (it needs the dispute UNDER_REVIEW; the buyer may have to escalate the case to a claim first).`); }
    await showDispute(client, disputeId, log);
  }
  log('Probe finished. Copy everything above and send it (it contains no secrets).');
}

async function main(): Promise<void> {
  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    await runDisputeProbe(clientFromEnv(), (q) => input.question(q), console.log);
  } catch (error) {
    console.error(describe(error));
    process.exitCode = 1;
  } finally {
    input.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
