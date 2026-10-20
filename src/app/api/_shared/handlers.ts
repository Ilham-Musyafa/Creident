import { createHash, randomUUID } from 'node:crypto';
import { canonicalJson, verifyChain } from '../../../lib/audit/chain';
import { mockShipment } from '../../../lib/mockCourier';
import { applyTrigger, type OrchestratorDeps } from '../../../lib/orchestrator';
import type { StoredTx } from '../../../lib/repository';
import { addDays } from '../../../lib/timeConfig';
import { prepareReview } from '../../../lib/reviewPipeline';
import { getApiContext, getPayPal, type ApiContext } from './context';
import { errorResponse, HttpError, json, jsonBody, noExtraFields, requireRole, route, stringField, unwrap, type Role } from './http';

function hash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function requireTx(context: ApiContext, id: string): StoredTx {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, 'INVALID_ID', 'Invalid transaction id');
  const tx = context.repo.loadTransaction(id);
  if (!tx) throw new HttpError(404, 'NOT_FOUND', 'Transaction not found');
  return tx;
}

async function emptyBody(request: Request): Promise<void> {
  const raw = await request.text();
  if (!raw) return;
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'JSON_REQUIRED', 'Send application/json');
  if (raw.length > 2 || raw.trim() !== '{}') throw new HttpError(400, 'INVALID_INPUT', 'Expected an empty JSON object');
}

function deps(context: ApiContext, actor: Role, payment = false, extra: Partial<OrchestratorDeps> = {}): OrchestratorDeps {
  return {
    repo: context.repo, actor, now: context.now,
    ...(payment ? { paypal: getPayPal(context) } : {}), ...extra,
  };
}

export function createTransaction(request: Request): Promise<Response> {
  return route(async () => {
    requireRole(request, ['seller']);
    const body = await jsonBody(request);
    noExtraFields(body, ['item', 'amount', 'currency', 'terms']);
    const item = stringField(body, 'item', 200);
    const amount = stringField(body, 'amount', 16);
    if (!/^\d{1,6}\.\d{2}$/.test(amount) || Number(amount) <= 0) throw new HttpError(400, 'INVALID_AMOUNT', 'amount must be positive USD with two decimals');
    if (body.currency !== undefined && body.currency !== 'USD') throw new HttpError(400, 'INVALID_CURRENCY', 'Only USD is supported');
    if (!body.terms || typeof body.terms !== 'object' || Array.isArray(body.terms)) throw new HttpError(400, 'INVALID_TERMS', 'terms must be a JSON object');
    const termsJson = canonicalJson(body.terms);
    if (termsJson.length > 8192) throw new HttpError(413, 'TERMS_TOO_LARGE', 'terms exceeds 8 KB');
    const context = getApiContext();
    const id = randomUUID();
    const tx: StoredTx = {
      id, status: 'DRAFT', captured: false, buyerId: 'buyer', sellerId: 'seller',
      item, amount, currency: 'USD', termsJson,
    };
    context.repo.createTransaction(tx, {
      txId: id, ts: context.now(), actor: 'seller', type: 'TRANSACTION_CREATED',
      payload: { item, amount, currency: 'USD', termsHash: hash(termsJson) },
    });
    return json({ transaction: tx }, 201);
  });
}

export function acceptTerms(request: Request, id: string): Promise<Response> {
  return route(async () => {
    const role = requireRole(request, ['buyer', 'seller']) as 'buyer' | 'seller';
    await emptyBody(request);
    const context = getApiContext();
    const tx = requireTx(context, id);
    if (tx.status === 'TERMS_LOCKED') return json({ transaction: tx });
    if (tx.status !== 'DRAFT') throw new HttpError(409, 'INVALID_STATE', 'Terms cannot be accepted in this state');
    const termsHash = hash(tx.termsJson);
    const bothAccepted = context.repo.recordAcceptance(id, role, termsHash, context.now());
    if (!bothAccepted) return json({ transaction: context.repo.loadTransaction(id), waitingForOtherParty: true });
    const result = unwrap(await applyTrigger(id, { type: 'ACCEPT_TERMS', bothAccepted: true },
      deps(context, role, false, { extras: { termsHash } })));
    return json({ transaction: result.tx, waitingForOtherParty: false });
  });
}

export function pay(request: Request, id: string): Promise<Response> {
  return route(async () => {
    const role = requireRole(request, ['buyer']);
    await emptyBody(request);
    const context = getApiContext();
    requireTx(context, id);
    const returnUrl = new URL('/api/paypal/return', request.url);
    returnUrl.searchParams.set('txId', id);
    returnUrl.searchParams.set('role', 'buyer');
    const cancelUrl = new URL(returnUrl);
    cancelUrl.searchParams.set('cancel', '1');
    const result = unwrap(await applyTrigger(id, { type: 'START_PAYMENT' },
      deps(context, role, true, { returnUrl: returnUrl.toString(), cancelUrl: cancelUrl.toString() })));
    return json({ transaction: result.tx, approvalUrl: result.approvalUrl });
  });
}

export function paypalReturn(request: Request): Promise<Response> {
  return route(async () => {
    const role = requireRole(request, ['buyer'], true);
    const params = new URL(request.url).searchParams;
    const id = params.get('txId') ?? '';
    const context = getApiContext();
    const tx = requireTx(context, id);
    if (params.get('cancel') === '1') {
      const result = unwrap(await applyTrigger(id, { type: 'CANCEL' }, deps(context, role)));
      return json({ transaction: result.tx });
    }
    if (tx.status !== 'AWAITING_APPROVAL') return json({ transaction: tx });
    if (!tx.paypalOrderId || params.get('token') !== tx.paypalOrderId) throw new HttpError(400, 'ORDER_MISMATCH', 'PayPal order token does not match');
    const paypal = getPayPal(context);
    const orderStatus = await paypal.getOrderStatus(tx.paypalOrderId);
    if (orderStatus !== 'APPROVED') throw new HttpError(409, 'ORDER_NOT_APPROVED', 'Buyer has not approved the PayPal order');
    const result = unwrap(await applyTrigger(id, { type: 'BUYER_APPROVED', orderApproved: true },
      deps(context, role, true, { extras: { shipBy: addDays(context.now(), context.time.shipByDays) } })));
    return json({ transaction: result.tx });
  });
}

export function ship(request: Request, id: string): Promise<Response> {
  return route(async () => {
    const role = requireRole(request, ['seller']);
    const body = await jsonBody(request);
    noExtraFields(body, ['tracking']);
    const tracking = stringField(body, 'tracking', 40);
    const shipment = mockShipment(tracking);
    if (!shipment) throw new HttpError(400, 'UNKNOWN_TRACKING', 'Use a documented simulated tracking number');
    const context = getApiContext();
    requireTx(context, id);
    const shipped = unwrap(await applyTrigger(id, { type: 'SUBMIT_TRACKING', now: context.now() },
      deps(context, role, false, { extras: { trackingNumber: tracking }, eventPayload: { tracking, simulated: true } })));
    if (shipment.status !== 'DELIVERED') return json({ transaction: shipped.tx, courier: shipment });
    const delivered = unwrap(await applyTrigger(id, { type: 'TRACKING_DELIVERED', destinationMatches: shipment.destinationMatches },
      deps(context, role, false, {
        extras: shipment.destinationMatches ? { inspectionUntil: addDays(context.now(), context.time.inspectionDays) } : {},
        eventPayload: { tracking, simulated: true, destinationMatches: shipment.destinationMatches },
      })));
    if (delivered.tx.status === 'UNDER_REVIEW') await prepareReview(id, context);
    return json({ transaction: delivered.tx, courier: shipment });
  });
}

export function confirmReceipt(request: Request, id: string): Promise<Response> {
  return route(async () => {
    const role = requireRole(request, ['buyer']);
    await emptyBody(request);
    const context = getApiContext();
    requireTx(context, id);
    const result = unwrap(await applyTrigger(id, { type: 'BUYER_CONFIRM', externalDisputeOpen: false }, deps(context, role, true)));
    return json({ transaction: result.tx });
  });
}

export function openDispute(request: Request, id: string): Promise<Response> {
  return route(async () => {
    const role = requireRole(request, ['buyer']);
    await emptyBody(request);
    const context = getApiContext();
    requireTx(context, id);
    const result = unwrap(await applyTrigger(id, { type: 'OPEN_DISPUTE', now: context.now() },
      deps(context, role, false, { extras: { evidenceUntil: addDays(context.now(), context.time.evidenceDays) } })));
    return json({ transaction: result.tx });
  });
}

export function submitEvidence(request: Request, id: string): Promise<Response> {
  return route(async () => {
    const role = requireRole(request, ['buyer', 'seller']) as 'buyer' | 'seller';
    const body = await jsonBody(request);
    noExtraFields(body, ['kind', 'content']);
    const kind = stringField(body, 'kind', 20);
    if (!['photo', 'tracking', 'chat', 'note'].includes(kind)) throw new HttpError(400, 'INVALID_KIND', 'Unsupported evidence kind');
    const content = stringField(body, 'content', 4096);
    const context = getApiContext();
    const tx = requireTx(context, id);
    if (tx.status !== 'DISPUTED' || !tx.evidenceUntil || context.now() >= tx.evidenceUntil) {
      throw new HttpError(409, 'EVIDENCE_CLOSED', 'Evidence window is closed');
    }
    const evidenceId = context.repo.recordEvidence({ txId: id, submittedBy: role, kind, content, contentHash: hash(content), ts: context.now() });
    if (!context.repo.bothSidesSubmitted(id)) return json({ evidenceId, transaction: context.repo.loadTransaction(id) }, 201);
    const result = unwrap(await applyTrigger(id, { type: 'EVIDENCE_COMPLETE' }, deps(context, role)));
    await prepareReview(id, context);
    return json({ evidenceId, transaction: result.tx }, 201);
  });
}

export function review(request: Request, id: string): Promise<Response> {
  return route(async () => {
    const role = requireRole(request, ['reviewer']);
    const body = await jsonBody(request);
    noExtraFields(body, ['outcome', 'reason']);
    if (body.outcome !== 'RELEASE' && body.outcome !== 'REFUND' && body.outcome !== 'SPLIT') throw new HttpError(400, 'INVALID_OUTCOME', 'outcome must be RELEASE, REFUND, or SPLIT');
    const reason = stringField(body, 'reason', 2000);
    const context = getApiContext();
    const tx = requireTx(context, id);
    if (tx.status === 'UNDER_REVIEW') await prepareReview(id, context);
    if (body.outcome === 'SPLIT') {
      if (tx.status !== 'UNDER_REVIEW') throw new HttpError(409, 'INVALID_STATE', 'Split requires human review');
      context.repo.recordPendingSplit(id, 'reviewer', reason, context.now());
      return json({ transaction: context.repo.loadTransaction(id), pendingSplit: true });
    }
    if (context.repo.hasPendingSplit(id)) throw new HttpError(409, 'SPLIT_PENDING', 'A pending split must be resolved before another decision');
    const result = unwrap(await applyTrigger(id, { type: 'DECISION', outcome: body.outcome },
      deps(context, role, true, {
        extras: { decision: { outcome: body.outcome, reviewerId: 'reviewer', reason } },
        eventPayload: { reason, outcome: body.outcome },
      })));
    return json({ transaction: result.tx });
  });
}

export function getReview(request: Request, id: string): Promise<Response> {
  return route(() => {
    requireRole(request, ['reviewer']);
    const context = getApiContext();
    const tx = requireTx(context, id);
    const recommendation = context.repo.loadRecommendation(id);
    return json({ transaction: tx, recommendation, pendingSplit: context.repo.hasPendingSplit(id) },
      recommendation ? 200 : 202);
  });
}

export function auditLog(request: Request, id: string): Promise<Response> {
  return route(() => {
    requireRole(request, ['buyer', 'seller', 'reviewer']);
    const context = getApiContext();
    requireTx(context, id);
    const events = context.repo.readEvents(id);
    return json({ txId: id, events, verification: verifyChain(events) });
  });
}

export function verifyAudit(request: Request): Promise<Response> {
  return route(() => {
    requireRole(request, ['buyer', 'seller', 'reviewer']);
    const context = getApiContext();
    const txIds = context.db.prepare('SELECT id FROM transactions ORDER BY id').all().map((row) => String(row.id));
    const results = txIds.map((txId) => ({ txId, ...verifyChain(context.repo.readEvents(txId)) }));
    return json({ ok: results.every((result) => result.ok), results });
  });
}

export function courier(request: Request, tracking: string): Promise<Response> {
  return route(() => {
    requireRole(request, ['buyer', 'seller', 'reviewer']);
    const shipment = mockShipment(tracking);
    if (!shipment) throw new HttpError(404, 'NOT_FOUND', 'Simulated tracking number not found');
    return json(shipment);
  });
}

export function tick(request: Request): Promise<Response> {
  return route(async () => {
    const role = requireRole(request, ['reviewer']);
    await emptyBody(request);
    const context = getApiContext();
    const now = context.now();
    const due = [
      ...context.repo.listDue('AUTHORIZED', 'ship_by', now).filter((tx) => tx.shipBy! < now)
        .map((tx) => ({ tx, trigger: { type: 'SHIP_DEADLINE_PASSED', now } as const })),
      ...context.repo.listDue('IN_INSPECTION', 'inspection_until', now).map((tx) => ({ tx, trigger: { type: 'INSPECTION_EXPIRED', now, externalDisputeOpen: false } as const })),
      ...context.repo.listDue('DISPUTED', 'evidence_until', now).map((tx) => ({ tx, trigger: { type: 'EVIDENCE_COMPLETE' } as const })),
    ];
    const results = [];
    for (const { tx, trigger } of due) {
      try {
        const payment = trigger.type !== 'EVIDENCE_COMPLETE';
        const applied = unwrap(await applyTrigger(tx.id, trigger, deps(context, role, payment)));
        if (applied.tx.status === 'UNDER_REVIEW') await prepareReview(tx.id, context);
        results.push({ txId: tx.id, status: applied.tx.status, ok: true });
      } catch (error) {
        const response = errorResponse(error);
        const body = await response.json() as { error: string };
        results.push({ txId: tx.id, ok: false, error: body.error });
      }
    }
    for (const tx of context.repo.listByStatus('UNDER_REVIEW')) {
      if (!context.repo.loadRecommendation(tx.id)) {
        try {
          await prepareReview(tx.id, context);
          results.push({ txId: tx.id, status: tx.status, ok: true });
        } catch (error) {
          const response = errorResponse(error);
          const body = await response.json() as { error: string };
          results.push({ txId: tx.id, ok: false, error: body.error });
        }
      }
    }
    return json({ checkedAt: now, results });
  });
}
