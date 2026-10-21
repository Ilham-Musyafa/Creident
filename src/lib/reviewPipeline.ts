import { containsPromptInjection, summarizeEvidence, type AiEvidenceProvider, type EvidenceRequest } from './ai/evidence';
import { decisionBasis } from './decisionBasis';
import { mockShipment } from './mockCourier';
import { TransactionRepository, type StoredTx, type StoredRecommendation } from './repository';
import { decide, type RuleInput } from './rules/engine';

export interface ReviewDeps {
  repo: TransactionRepository;
  now?: () => string;
  aiProvider?: AiEvidenceProvider;
  aiEnv?: Record<string, string | undefined>;
}

function criteriaFromTerms(tx: StoredTx): string[] | null {
  const terms = JSON.parse(tx.termsJson) as Record<string, unknown>;
  if (Array.isArray(terms.criteria)) {
    return terms.criteria.length > 0 && terms.criteria.length <= 20 &&
      terms.criteria.every((value) => typeof value === 'string' && value.trim() && value.length <= 200)
      ? terms.criteria as string[] : null;
  }
  const entries = Object.entries(terms);
  if (entries.length > 20) return null;
  if (entries.length === 0) return ['Whether the delivered item matches the locked terms'];
  const criteria = entries.map(([key, value]) => `Agreed ${key}: ${JSON.stringify(value)}`);
  return criteria.every((value) => value.length <= 200) ? criteria : null;
}

function facts(tx: StoredTx, evidence: ReturnType<TransactionRepository['loadEvidence']>, ai: RuleInput['ai'], injection: boolean, now: string, repo: TransactionRepository): RuleInput {
  const shipment = tx.trackingNumber ? mockShipment(tx.trackingNumber) : null;
  const events = repo.readEvents(tx.id);
  const created = events.find((event) => event.type === 'TRANSACTION_CREATED');
  const shipped = events.find((event) => event.type === 'SUBMIT_TRACKING');
  const shipDateConsistent = !shipped ||
    ((!created || shipped.ts >= created.ts) && (!tx.shipBy || shipped.ts <= tx.shipBy));
  return {
    phase: 'DISPUTE', externalDisputeOpen: false, evidenceContainsInjection: injection,
    shipByPassed: !!tx.shipBy && now > tx.shipBy,
    hasTracking: !!tx.trackingNumber,
    trackingDelivered: shipment?.status === 'DELIVERED',
    destinationMatches: shipment?.destinationMatches ?? null,
    shipDateConsistent, buyerConfirmed: false,
    inspectionExpired: !!tx.inspectionUntil && now >= tx.inspectionUntil,
    disputeOpen: !!tx.evidenceUntil,
    buyerEvidenceCount: evidence.filter((item) => item.submittedBy === 'buyer').length,
    sellerEvidenceCount: evidence.filter((item) => item.submittedBy === 'seller').length,
    disputeType: typeof events.find((event) => event.type === 'OPEN_DISPUTE')?.payload.disputeType === 'string'
      ? String(events.find((event) => event.type === 'OPEN_DISPUTE')!.payload.disputeType) : undefined,
    ai,
  };
}

/** Produces and records a recommendation; never applies a money-moving transition. */
export async function prepareReview(txId: string, deps: ReviewDeps): Promise<StoredRecommendation> {
  const existing = deps.repo.loadRecommendation(txId);
  if (existing) return existing;
  const tx = deps.repo.loadTransaction(txId);
  if (!tx || tx.status !== 'UNDER_REVIEW') throw new Error('Transaction is not under review');
  const evidence = deps.repo.loadEvidence(txId);
  const criteria = criteriaFromTerms(tx);
  let ai: RuleInput['ai'] = null;
  let injection = containsPromptInjection(evidence);
  if (criteria) {
    const input: EvidenceRequest = { criteria, evidence, seed: tx.id };
    try {
      const summary = await summarizeEvidence(input, {
        env: deps.aiEnv, provider: deps.aiProvider,
      });
      ai = summary.ai;
      injection = summary.evidenceContainsInjection;
    } catch {
      // Provider and schema failures leave an auditable R5 recommendation.
      ai = null;
    }
  }
  const ts = (deps.now ?? (() => new Date().toISOString()))();
  const recommendation = decide(facts(tx, evidence, ai, injection, ts, deps.repo));
  return deps.repo.saveRecommendation(txId, ai, recommendation, ts, decisionBasis(tx.termsJson, evidence));
}
