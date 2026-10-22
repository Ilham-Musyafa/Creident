import type { DatabaseSync } from 'node:sqlite';
import { verifyChain, type AuditEvent } from './audit/chain';
import { latestCheckpoint, type PublishedCheckpoint } from './audit/checkpointFiles';
import { disputeType } from './disputeTypes';
import { paypalDisputeLabel } from './paypalDisputeLabels';
import type { TransactionRepository } from './repository';

export interface AssistCounts {
  feature: string; created: number; unchanged: number; edited: number; unavailable: number; injection: number;
}
export interface OversightSnapshot {
  asOf: string; totalDeals: number; demoDeals: number;
  disputes: Array<{ status: string; type: string; count: number }>;
  escalation: { escalated: number; recommendations: number; rate: number | null };
  deadlines: Array<{ txId: string; item: string; kind: string; dueAt: string; remainingMinutes: number; frozen: boolean; simulated: boolean }>;
  assists: AssistCounts[];
  paypal: Array<{ status: string; stage: string; count: number; simulated: boolean }>;
  audit: { verified: number; failed: number; empty: number; events: number; checkpoint: PublishedCheckpoint };
}

const RUN_EVENTS = new Set(['AI_DRAFT_CREATED', 'EVIDENCE_CHECK_RUN', 'EVIDENCE_TRANSLATED', 'TRANSACTION_CREATED']);
const USE_EVENTS = new Set(['TRANSACTION_CREATED', 'DECISION', 'HUMAN_SPLIT_PENDING', 'COURIER_CLAIM_PACK_CREATED', 'PAYPAL_DISPUTE_MESSAGE_SENT', 'PAYPAL_DISPUTE_EVIDENCE_SENT']);
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};

/** Count recorded runs/uses, not inferred acceptance or missing/ignored drafts. */
export function assistCounts(events: readonly AuditEvent[]): AssistCounts[] {
  const rows = new Map<string, AssistCounts>();
  const uses = new Set<string>();
  const row = (feature: string) => {
    if (!rows.has(feature)) rows.set(feature, { feature, created: 0, unchanged: 0, edited: 0, unavailable: 0, injection: 0 });
    return rows.get(feature)!;
  };
  for (const e of events) {
    const p = e.payload;
    // Accepted terms metadata is top-level; decision/outbound uses are nested.
    const draft = e.type === 'TRANSACTION_CREATED' ? p : object(p.aiDraft);
    const run = p;
    if (RUN_EVENTS.has(e.type) && typeof run.feature === 'string') {
      const r = row(run.feature);
      if (typeof run.unavailable === 'string' || run.outputHash === null) r.unavailable++;
      else if (typeof run.outputHash === 'string') r.created++;
      if (run.inputContainsInjection === true || p.inputContainsInjection === true) r.injection++;
    }
    if (!USE_EVENTS.has(e.type) || typeof draft.feature !== 'string' || !['unchanged', 'edited'].includes(String(draft.accepted))) continue;
    const key = `${e.txId}:${draft.feature}:${typeof draft.draftId === 'string' ? draft.draftId : draft.outputHash}`;
    if (uses.has(key)) continue;
    uses.add(key);
    row(draft.feature)[draft.accepted === 'unchanged' ? 'unchanged' : 'edited']++;
  }
  return [...rows.values()].sort((a, b) => a.feature.localeCompare(b.feature));
}

/** A local, read-only snapshot. No provider calls, draft text, evidence text or credentials leave this function. */
export function oversightSnapshot(db: DatabaseSync, repo: TransactionRepository, now: string,
  checkpoint: typeof latestCheckpoint = latestCheckpoint): OversightSnapshot {
  // Read all rows rather than silently inheriting the UI list's 200-deal limit.
  const txs = db.prepare('SELECT id FROM transactions ORDER BY id').all().map(r => repo.loadTransaction(String(r.id))!);
  const chains = new Map(txs.map(tx => [tx.id, repo.readEvents(tx.id)] as const));
  const events = [...chains.values()].flat();
  const cases = repo.listPayPalDisputes();
  const disputes = new Map<string, { status: string; type: string; count: number }>();
  const deadlines: OversightSnapshot['deadlines'] = [];
  const recommendations = txs.flatMap(tx => { const rec = repo.loadRecommendation(tx.id); return rec ? [rec] : []; });
  let demoDeals = 0; let verified = 0; let failed = 0; let empty = 0;
  for (const tx of txs) {
    const simulated = object(JSON.parse(tx.termsJson)).demo === true;
    if (simulated) demoDeals++;
    const chain = chains.get(tx.id)!;
    if (!chain.length) empty++;
    else if (verifyChain(chain).ok && chain.every(e => e.txId === tx.id)) verified++;
    else failed++;
    const opened = chain.find(e => e.type === 'OPEN_DISPUTE');
    if (opened || tx.status === 'FROZEN_EXTERNAL' || cases.some(c => c.txId === tx.id)) {
      const type = disputeType(opened?.payload.disputeType)?.label ?? (cases.some(c => c.txId === tx.id) ? 'PayPal case' : 'External freeze');
      const key = `${tx.status}:${type}`;
      const group = disputes.get(key) ?? { status: tx.status, type, count: 0 };
      group.count++; disputes.set(key, group);
    }
    const state = tx.status === 'FROZEN_EXTERNAL' ? tx.frozenFrom : tx.status;
    const due = state === 'AUTHORIZED' ? ['Ship by', tx.shipBy] : state === 'IN_INSPECTION' ? ['Inspection', tx.inspectionUntil]
      : state === 'DISPUTED' ? ['Evidence', tx.evidenceUntil] : state === 'RETURN_REQUESTED' ? ['Return', tx.returnBy] : undefined;
    if (due?.[1] && Number.isFinite(Date.parse(due[1]))) deadlines.push({ txId: tx.id, item: tx.item, kind: due[0]!, dueAt: due[1],
      remainingMinutes: Math.ceil((Date.parse(due[1]) - Date.parse(now)) / 60_000), frozen: tx.status === 'FROZEN_EXTERNAL', simulated });
  }
  const paypal = new Map<string, OversightSnapshot['paypal'][number]>();
  for (const c of cases) {
    const simulated = /^(SIM|DEMO)-/.test(c.disputeId);
    const status = paypalDisputeLabel('status', c.status); const stage = paypalDisputeLabel('stage', c.stage);
    const key = JSON.stringify([status, stage, simulated]);
    const group = paypal.get(key) ?? { status, stage, count: 0, simulated };
    group.count++; paypal.set(key, group);
  }
  const escalated = recommendations.filter(r => r.action === 'ESCALATE_HUMAN').length;
  return { asOf: now, totalDeals: txs.length, demoDeals, disputes: [...disputes.values()],
    escalation: { escalated, recommendations: recommendations.length, rate: recommendations.length ? escalated / recommendations.length : null },
    deadlines: deadlines.sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.txId.localeCompare(b.txId)),
    assists: assistCounts(events), paypal: [...paypal.values()],
    audit: { verified, failed, empty, events: events.length, checkpoint: checkpoint(chains) } };
}
