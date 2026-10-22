import { usdCents } from './partialAmount';
// Demo data so every screen can be shown without calling PayPal.
// Transactions are moved through the real state machine and orchestrator, so their audit
// chains are genuine, but PayPal is replaced by a stub that returns DEMO-* ids.
// Every demo transaction is labelled: item names start with "[Demo]", terms carry
// `demo: true`, and every PayPal-related audit event carries `simulated: true`.

import { decisionBasis } from './decisionBasis';
import { draftTerms } from './ai/terms';
import { TERMS_SAMPLES } from './ai/termsSamples';
import { draftCopilot } from './ai/copilot';
import { randomUUID, createHash } from 'node:crypto';
import { canonicalJson } from './audit/chain';
import { applyTrigger, type OrchestratorDeps } from './orchestrator';
import type { TransactionRepository, StoredTx } from './repository';
import type { Trigger } from './domain/types';
import { sendTrackingToPayPal, type TrackingClient } from './paypalTracking';
import { prepareReview } from './reviewPipeline';
import type { DisputeTypeId } from './disputeTypes';
import { addDays, type TimeConfig } from './timeConfig';

type PaymentStub = NonNullable<OrchestratorDeps['paypal']>;

function stubPayPal(prefix: string, total: string): PaymentStub & TrackingClient {
  return {
    createAuthorizeOrder: async () => ({ orderId: `DEMO-ORDER-${prefix}`, status: 'PAYER_ACTION_REQUIRED', approvalUrl: '#demo' }),
    authorizeOrder: async () => ({ orderStatus: 'COMPLETED', authorizationId: `DEMO-AUTH-${prefix}`, authorizationStatus: 'CREATED' }),
    captureAuthorization: async () => ({ captureId: `DEMO-CAPTURE-${prefix}`, status: 'COMPLETED' }),
    voidAuthorization: async () => undefined,
    refundCapture: async (_captureId, _requestId, amount) => {
      if (amount && (amount.currency !== 'USD' || !(usdCents(amount.value)! > 0) || usdCents(amount.value)! > usdCents(total)!)) throw new Error('Invalid demo refund amount');
      return { refundId: `DEMO-REFUND-${prefix}`, status: 'COMPLETED' };
    },
    addTracking: async () => ({ trackerId: `DEMO-TRACKER-${prefix}` }),
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
  disputeType?: DisputeTypeId;
  decisionReason?: string;
  /** Steps after creation. Strings are shorthand for common steps. */
  steps: Array<Trigger | 'accept' | 'ship-delivered' | 'dispute' | 'miss-deadline' | 'evidence-both' | 'return-delivered'>;
}

const SPECS: DemoSpec[] = [
  { item: '[Demo] Vintage film camera', amount: '85.00', terms: { condition: 'Good, lens clear', criteria: ['Lens has no fungus or haze', 'Shutter fires at all speeds'] }, steps: [] },
  { item: '[Demo] Wireless earbuds', amount: '35.00', terms: { condition: 'Like new, all ear tips' }, steps: ['accept', { type: 'START_PAYMENT' }] },
  { item: '[Demo] Mechanical keyboard', amount: '40.00', terms: { condition: 'Good, all keys work' }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }] },
  { item: '[Demo] Used phone, 128 GB', amount: '120.00', terms: { condition: 'Good, battery 86%', criteria: ['Battery health at least 85%', 'Screen has no cracks'] }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'ship-delivered'] },
  { item: '[Demo] Road bike helmet', disputeType: 'damaged', amount: '28.00', terms: { condition: 'Good, no cracks' }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'ship-delivered', 'dispute'] },
  { item: '[Demo] Smartwatch', disputeType: 'damaged', amount: '64.00', terms: { condition: 'Good, minor scratches', criteria: ['Screen has no cracks', 'Strap included'] }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'ship-delivered', 'dispute', 'evidence-both'] },
  { item: '[Demo] Damaged smartwatch (resolved)', amount: '64.00', disputeType: 'damaged', decisionReason: 'The buyer photo shows a cracked screen despite the agreed condition. Cancel the payment authorization once the return is received; nothing was charged.', terms: { condition: 'Good, minor scratches', criteria: ['Screen has no cracks', 'Strap included'] }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'ship-delivered', 'dispute', 'evidence-both', { type: 'DECISION', outcome: 'REFUND', requireReturn: true }, 'return-delivered'] },
  { item: '[Demo] Smartwatch (return pending)', amount: '64.00', disputeType: 'damaged', decisionReason: 'The buyer photo shows a cracked screen despite the agreed condition. Cancel the payment authorization once the return is received.', terms: { condition: 'Good, minor scratches', criteria: ['Screen has no cracks', 'Strap included'] }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'ship-delivered', 'dispute', 'evidence-both', { type: 'DECISION', outcome: 'REFUND', requireReturn: true }] },
  { item: '[Demo] Board game set', amount: '22.00', terms: { condition: 'Complete, box worn' }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'ship-delivered', { type: 'BUYER_CONFIRM', externalDisputeOpen: false }] },
  { item: '[Demo] Board game (PayPal case)', amount: '22.00', terms: { condition: 'Complete, box worn' }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'ship-delivered', { type: 'BUYER_CONFIRM', externalDisputeOpen: false }] },
  { item: '[Demo] Desk lamp', amount: '18.00', terms: { condition: 'Works, base scratched' }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'miss-deadline'] },
  { item: '[Demo] Drone with spare battery', amount: '150.00', terms: { condition: 'Good, one prop replaced' }, steps: ['accept', { type: 'START_PAYMENT' }, { type: 'BUYER_APPROVED', orderApproved: true }, 'ship-delivered', { type: 'EXTERNAL_DISPUTE' }] },
  { item: '[Demo] Camping stove', amount: '30.00', terms: { condition: 'Good' }, steps: ['accept', { type: 'CANCEL' }] },
];

export interface SeedOptions {
  repo: TransactionRepository;
  time: TimeConfig;
  now?: () => string;
  /** Called whenever a demo enters UNDER_REVIEW, before any seeded human decision. */
  onUnderReview?: (txId: string) => Promise<unknown>;
}

/** Adds missing labelled demo cases, preserving previously seeded transactions and audit logs. */
export async function seedDemoData(options: SeedOptions): Promise<{ created: number; skipped: boolean }> {
  const { repo, time } = options;
  const existingItems = new Set(repo.listTransactions(500).map(tx => tx.item));
  const missingSpecs = SPECS.filter(spec => !existingItems.has(spec.item));
  const now = options.now ?? (() => new Date().toISOString());
  let created = 0;

  for (const spec of missingSpecs) {
    const id = randomUUID();
    const terms = { ...spec.terms, demo: true };
    const termsJson = canonicalJson(terms);
    // An actual recorded replay, accepted with edited terms in this synthetic example.
    const termsDraft = spec.item === '[Demo] Vintage film camera'
      ? await draftTerms(TERMS_SAMPLES.find(sample => sample.id === 'camera')!.text, { env: { AI_MODE: 'replay' } }) : null;
    const tx: StoredTx = {
      id, status: 'DRAFT', captured: false, buyerId: 'buyer', sellerId: 'seller',
      item: spec.item, amount: spec.amount, currency: 'USD', termsJson,
    };
    repo.createTransaction(tx, {
      txId: id, ts: now(), actor: 'seller', type: 'TRANSACTION_CREATED',
      payload: { item: spec.item, amount: spec.amount, currency: 'USD', termsHash: hash(termsJson), demo: true,
        ...(termsDraft?.output ? { simulated: true, ...termsDraft.meta, accepted: 'edited', inputContainsInjection: termsDraft.inputContainsInjection } : {}) },
    });
    created++;
    // A seller always accepts their own terms when creating a deal (as the UI does).
    if (spec.steps[0] !== 'accept') repo.recordAcceptance(id, 'seller', hash(termsJson), now());

    const paypal = stubPayPal(id.slice(0, 8), spec.amount);
    const deps = (actor: string, extra: Partial<OrchestratorDeps> = {}): OrchestratorDeps => ({
      repo, actor, now, paypal,
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
        await run({ type: 'OPEN_DISPUTE', now: now() }, 'buyer', {
          extras: { evidenceUntil: addDays(now(), time.evidenceDays) },
          eventPayload: { simulated: true, disputeType: spec.disputeType },
        });
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
        if (!repo.loadRecommendation(id)) await prepareReview(id, { repo, now, aiEnv: { AI_MODE: 'replay' } });
      } else if (step !== 'return-delivered' && step.type === 'DECISION') {
        if (!spec.decisionReason) throw new Error('Demo decision needs a reason');
        await run(step, 'reviewer', {
          extras: {
            decision: { outcome: step.outcome, reviewerId: 'reviewer', reason: spec.decisionReason },
            ...(step.requireReturn ? { returnBy: addDays(now(), time.returnDays) } : {}),
          },
          // Same decision basis the review API records, so the receipt can show it.
          eventPayload: {
            simulated: true, reason: spec.decisionReason, outcome: step.outcome,
            ...(step.outcome === 'REFUND' ? { requireReturn: !!step.requireReturn } : {}),
            ...decisionBasis(repo.loadTransaction(id)!.termsJson, repo.loadEvidence(id)),
          },
        });
      } else if (step === 'return-delivered') {
        await run({ type: 'RETURN_DELIVERED', now: now(), destinationMatches: true }, 'buyer', {
          extras: { returnTracking: 'DEMO-DELIVERED' },
          eventPayload: { simulated: true, returnTracking: 'DEMO-DELIVERED', destinationMatches: true },
        });
      } else {
        const actor = step.type === 'BUYER_CONFIRM' || step.type === 'CANCEL' || step.type === 'START_PAYMENT' || step.type === 'BUYER_APPROVED' ? 'buyer'
          : step.type === 'EXTERNAL_DISPUTE' ? 'paypal' : 'system';
        await run(step, actor, step.type === 'BUYER_APPROVED' ? { extras: { shipBy: addDays(now(), time.shipByDays) } } : {});
        if (step.type === 'BUYER_CONFIRM') {
          const tracking = await sendTrackingToPayPal(id, { repo, paypal, now, actor, eventPayload: { simulated: true } });
          if (tracking !== 'sent') throw new Error(`Demo seed tracking was ${tracking}`);
        }
      }
    }
    if (spec.item === '[Demo] Board game (PayPal case)') {
      // The existing repository path freezes a captured deal and records detection atomically.
      repo.savePayPalDispute({ txId: id, disputeId: `SIM-CASE-${id}`, status: 'WAITING_FOR_SELLER_RESPONSE',
        stage: 'INQUIRY', reason: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED', actions: ['send_message', 'escalate'], updatedAt: now() }, true);
    }
  }
  // Backfill the actual replay on an unchanged older seed too. Never overwrite evidence,
  // recommendations or a user's later decisions; an unmatched replay simply stays absent.
  const review = repo.listTransactions(500).find(tx => tx.item === '[Demo] Smartwatch' && tx.status === 'UNDER_REVIEW');
  const rec = review ? repo.loadRecommendation(review.id) : null;
  const reviewEvents = review ? repo.readEvents(review.id) : [];
  const type = reviewEvents.find(e => e.type === 'OPEN_DISPUTE')?.payload.disputeType;
  let replayAdded = false;
  if (review && rec && JSON.parse(review.termsJson).demo === true &&
      !reviewEvents.some(e => e.type === 'AI_DRAFT_CREATED' && e.payload.feature === 'copilot')) {
    const evidence = repo.loadEvidence(review.id);
    const result = await draftCopilot({ tx: review, evidence, recommendation: rec,
      disputeType: typeof type === 'string' ? type : undefined }, { env: { AI_MODE: 'replay' } });
    if (result.output) {
      const draftId = randomUUID();
      repo.storeAssistDraft(draftId, review.id, 'copilot', { draft: result.output, basis: decisionBasis(review.termsJson, evidence) }, result.meta,
        { txId: review.id, ts: now(), actor: 'reviewer', type: 'AI_DRAFT_CREATED',
          payload: { ...result.meta, draftId, inputContainsInjection: result.inputContainsInjection, simulated: true } });
      replayAdded = true;
    }
  }
  return { created, skipped: created === 0 && !replayAdded };
}
