// Demo data so every screen can be shown without calling PayPal.
// Transactions are moved through the real state machine and orchestrator, so their audit
// chains are genuine, but PayPal is replaced by a stub that returns DEMO-* ids.
// Every demo transaction is labelled: item names start with "[Demo]", terms carry
// `demo: true`, and every PayPal-related audit event carries `simulated: true`.

import { randomUUID, createHash } from 'node:crypto';
import { canonicalJson } from './audit/chain';
import { applyTrigger, type OrchestratorDeps } from './orchestrator';
import type { TransactionRepository, StoredTx } from './repository';
import type { Trigger } from './domain/types';
import { addDays, type TimeConfig } from './timeConfig';

type PaymentStub = NonNullable<OrchestratorDeps['paypal']>;

function stubPayPal(prefix: string): PaymentStub {
  return {
    createAuthorizeOrder: async () => ({ orderId: `DEMO-ORDER-${prefix}`, status: 'PAYER_ACTION_REQUIRED', approvalUrl: '#demo' }),
    authorizeOrder: async () => ({ orderStatus: 'COMPLETED', authorizationId: `DEMO-AUTH-${prefix}`, authorizationStatus: 'CREATED' }),
    captureAuthorization: async () => ({ captureId: `DEMO-CAPTURE-${prefix}`, status: 'COMPLETED' }),
    voidAuthorization: async () => undefined,
    refundCapture: async () => ({ refundId: `DEMO-REFUND-${prefix}`, status: 'COMPLETED' }),
  };
}

const hash = (text: string) => createHash('sha256').update(text).digest('hex');

export function hasDemoData(repo: TransactionRepository): boolean {
  return repo.listTransactions(500).some((tx) => tx.item.startsWith('[Demo]'));
}

interface DemoSpec {
  item: string;
  amount: string;
  terms: Record<string, unknown>;
  /** Steps after creation. Strings are shorthand for common steps. */
  steps: Array<Trigger | 'accept' | 'ship-delivered' | 'dispute' | 'miss-deadline' | 'evidence-both'>;
}

const SPECS: DemoSpec[] = [
  { item: '[Demo] Vintage film camera', amount: '85.00', terms: { condition: 'Good, lens clear', criteria: ['Lens has no fungus or haze', 'Shutter fires at all speeds'] }, steps: [] },
  { item: '[Demo] Wireless earbuds', amount: '35.00', terms: { condition: 'Like new, all ear tips' }, steps: ['accept', { type: 'START_PAYMENT' }] },
  { item: '[Demo] Mechanical keyboard', amount: '40.00', terms: { condition: 'Good, all keys work' }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }] },
  { item: '[Demo] Used phone, 128 GB', amount: '120.00', terms: { condition: 'Good, battery 86%', criteria: ['Battery health at least 85%', 'Screen has no cracks'] }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'ship-delivered'] },
  { item: '[Demo] Road bike helmet', amount: '28.00', terms: { condition: 'Good, no cracks' }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'ship-delivered', 'dispute'] },
  { item: '[Demo] Smartwatch', amount: '64.00', terms: { condition: 'Good, minor scratches', criteria: ['Screen has no cracks', 'Strap included'] }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'ship-delivered', 'dispute', 'evidence-both'] },
  { item: '[Demo] Board game set', amount: '22.00', terms: { condition: 'Complete, box worn' }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'ship-delivered', { type: 'BUYER_CONFIRM', externalDisputeOpen: false }] },
  { item: '[Demo] Desk lamp', amount: '18.00', terms: { condition: 'Works, base scratched' }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'miss-deadline'] },
  { item: '[Demo] Drone with spare battery', amount: '150.00', terms: { condition: 'Good, one prop replaced' }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'ship-delivered', { type: 'EXTERNAL_DISPUTE' }] },
  { item: '[Demo] Camping stove', amount: '30.00', terms: { condition: 'Good' }, steps: ['accept', { type: 'CANCEL' }] },
];

export interface SeedOptions {
  repo: TransactionRepository;
  time: TimeConfig;
  now?: () => string;
  /** Called for transactions that end in UNDER_REVIEW (e.g. prepareReview). */
  onUnderReview?: (txId: string) => Promise<unknown>;
}

/** Creates one demo transaction per main status. Does nothing if demo data already exists. */
export async function seedDemoData(options: SeedOptions): Promise<{ created: number; skipped: boolean }> {
  const { repo, time } = options;
  if (hasDemoData(repo)) return { created: 0, skipped: true };
  const now = options.now ?? (() => new Date().toISOString());
  let created = 0;

  for (const spec of SPECS) {
    const id = randomUUID();
    const terms = { ...spec.terms, demo: true };
    const termsJson = canonicalJson(terms);
    const tx: StoredTx = {
      id, status: 'DRAFT', captured: false, buyerId: 'buyer', sellerId: 'seller',
      item: spec.item, amount: spec.amount, currency: 'USD', termsJson,
    };
    repo.createTransaction(tx, {
      txId: id, ts: now(), actor: 'seller', type: 'TRANSACTION_CREATED',
      payload: { item: spec.item, amount: spec.amount, currency: 'USD', termsHash: hash(termsJson), demo: true },
    });
    created++;
    // A seller always accepts their own terms when creating a deal (as the UI does).
    if (spec.steps[0] !== 'accept') repo.recordAcceptance(id, 'seller', hash(termsJson), now());

    const deps = (actor: string, extra: Partial<OrchestratorDeps> = {}): OrchestratorDeps => ({
      repo, actor, now, paypal: stubPayPal(id.slice(0, 8)),
      returnUrl: 'https://example.com/demo-return', cancelUrl: 'https://example.com/demo-cancel',
      eventPayload: { simulated: true }, ...extra,
    });

    for (const step of spec.steps) {
      const run = async (trigger: Trigger, actor: string, extra: Partial<OrchestratorDeps> = {}) => {
        const result = await applyTrigger(id, trigger, deps(actor, extra));
        if (!result.ok) throw new Error(`Demo seed failed at ${trigger.type}: ${result.error.message}`);
        return result.tx;
      };
      if (step === 'accept') {
        const termsHash = hash(termsJson);
        repo.recordAcceptance(id, 'seller', termsHash, now());
        repo.recordAcceptance(id, 'buyer', termsHash, now());
        await run({ type: 'ACCEPT_TERMS', bothAccepted: true }, 'buyer', { extras: { termsHash } });
      } else if (step === 'ship-delivered') {
        await run({ type: 'SUBMIT_TRACKING', now: now() }, 'seller', { extras: { trackingNumber: 'DEMO-DELIVERED' }, eventPayload: { tracking: 'DEMO-DELIVERED', simulated: true } });
        await run({ type: 'TRACKING_DELIVERED', destinationMatches: true }, 'seller', {
          extras: { inspectionUntil: addDays(now(), time.inspectionDays) },
          eventPayload: { tracking: 'DEMO-DELIVERED', simulated: true, destinationMatches: true },
        });
      } else if (step === 'dispute') {
        await run({ type: 'OPEN_DISPUTE', now: now() }, 'buyer', { extras: { evidenceUntil: addDays(now(), time.evidenceDays) } });
      } else if (step === 'miss-deadline') {
        // Pretend the ship-by deadline is already over so R1 voids the authorization.
        const loaded = repo.loadTransaction(id)!;
        const after = addDays(loaded.shipBy ?? now(), 1);
        await run({ type: 'SHIP_DEADLINE_PASSED', now: after }, 'system');
      } else if (step === 'evidence-both') {
        const buyerNote = 'Photo of the watch face: a crack runs across the upper left corner. The one-time code is visible on paper.';
        const sellerNote = 'The watch was packed in bubble wrap; the listing photos showed no crack before shipping.';
        repo.recordEvidence({ txId: id, submittedBy: 'buyer', kind: 'photo', content: buyerNote, contentHash: hash(buyerNote), ts: now() });
        repo.recordEvidence({ txId: id, submittedBy: 'seller', kind: 'note', content: sellerNote, contentHash: hash(sellerNote), ts: now() });
        await run({ type: 'EVIDENCE_COMPLETE' }, 'seller');
        await options.onUnderReview?.(id);
      } else {
        const actor = step.type === 'BUYER_CONFIRM' || step.type === 'CANCEL' || step.type === 'START_PAYMENT' || step.type === 'BUYER_APPROVED' ? 'buyer'
          : step.type === 'EXTERNAL_DISPUTE' ? 'paypal' : 'system';
        await run(step, actor, step.type === 'BUYER_APPROVED' ? { extras: { shipBy: addDays(now(), time.shipByDays) } } : {});
      }
    }
  }
  return { created, skipped: false };
}
