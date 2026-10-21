import { checkEvidence, lockedChecklist, EVIDENCE_CHECK_UNAVAILABLE, type EvidenceSide } from '../../../../../../lib/ai/evidenceCheck';
import { evidenceDigest } from '../../../../../../lib/decisionBasis';
import { getApiContext } from '../../../../_shared/context';
import { HttpError, json, jsonBody, noExtraFields, requireRole, route } from '../../../../_shared/http';
import type { StoredTx } from '../../../../../../lib/repository';

export const runtime = 'nodejs';
const open = (tx: StoredTx | null, now: string) => tx?.status === 'DISPUTED' && !!tx.evidenceUntil &&
  Date.parse(now) < Date.parse(tx.evidenceUntil);

export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const side = requireRole(request, ['buyer', 'seller']) as EvidenceSide;
    const body = await jsonBody(request); noExtraFields(body, []);
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new HttpError(400, 'INVALID_ID', 'Invalid transaction id');
    const ctx = getApiContext();
    const tx = ctx.repo.loadTransaction(id);
    if (!tx) throw new HttpError(404, 'NOT_FOUND', 'Transaction not found');
    if (!open(tx, ctx.now())) throw new HttpError(409, 'EVIDENCE_CLOSED', 'The evidence window is closed for this deal');
    const own = ctx.repo.loadEvidence(id).filter(e => e.submittedBy === side);
    if (!lockedChecklist(tx) || own.length > 50) return json({ output: null, message: EVIDENCE_CHECK_UNAVAILABLE });
    // Durable, atomic reservation before the provider call. One initial run, then one per new
    // own evidence item, including failed runs. Reloads/concurrent requests cannot bypass it.
    // This distinct namespace never overlaps money actions; no text/output is stored here.
    const reserved = ctx.db.prepare('INSERT OR IGNORE INTO idempotency (key, tx_id, action, result) VALUES (?, ?, ?, ?)')
      .run(`${id}:ai-evidence-check:${side}:${own.length}`, id, 'AI_EVIDENCE_CHECK', JSON.stringify({ reserved: true }));
    if (!reserved.changes) throw new HttpError(429, 'CHECK_LIMIT', 'Add a new evidence item before checking again. You can still submit evidence.');
    const type = ctx.repo.readEvents(id).find(e => e.type === 'OPEN_DISPUTE')?.payload.disputeType;
    const result = await checkEvidence(tx, side, own, type, { env: ctx.aiEnv, provider: ctx.aiProvider });
    const counts = { covered: 0, missing: 0, unclear: 0 };
    for (const entry of result.output?.checks ?? []) counts[entry.status]++;
    ctx.repo.appendAuditEvent({ txId: id, ts: ctx.now(), actor: side, type: 'EVIDENCE_CHECK_RUN',
      payload: { ...result.meta, side, evidenceCount: own.length, ...counts, inputContainsInjection: result.inputContainsInjection,
        ...(JSON.parse(tx.termsJson).demo === true ? { simulated: true } : {}) } });
    // A tick, another submission or a freeze can happen during the network call. Do not
    // display a stale advisory result, and never extend the window to accommodate the AI.
    if (!open(ctx.repo.loadTransaction(id), ctx.now())) throw new HttpError(409, 'EVIDENCE_CLOSED', 'The evidence window closed during the check');
    if (evidenceDigest(own) !== evidenceDigest(ctx.repo.loadEvidence(id).filter(e => e.submittedBy === side))) {
      throw new HttpError(409, 'EVIDENCE_CHANGED', 'Your evidence changed during the check. Check again for the new items.');
    }
    return json({ ...result, checklist: lockedChecklist(tx), evidence: own.map((e, i) => ({
      alias: `${side === 'buyer' ? 'B' : 'S'}${i + 1}`, kind: e.kind,
    })), ...(result.output ? {} : { message: EVIDENCE_CHECK_UNAVAILABLE }) });
  });
}
