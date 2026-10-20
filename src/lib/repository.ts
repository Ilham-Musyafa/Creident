import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { appendEvent, type AuditEvent, type AuditEventInput } from './audit/chain';
import type { Tx, TxStatus } from './domain/types';
import { transition } from './domain/stateMachine';
import type { AiSummary, RuleAction, RuleDecision, RuleId } from './rules/engine';

export interface StoredTx extends Tx {
  buyerId: string;
  sellerId: string;
  item: string;
  amount: string;
  currency: string;
  termsJson: string;
  termsHash?: string;
  paypalOrderId?: string;
  paypalAuthId?: string;
  paypalCaptureId?: string;
  evidenceUntil?: string;
  trackingNumber?: string;
}

export interface TransitionExtras {
  termsHash?: string;
  shipBy?: string;
  trackingNumber?: string;
  inspectionUntil?: string;
  evidenceUntil?: string;
  decision?: { outcome: 'RELEASE' | 'REFUND'; reviewerId: string; reason: string };
}

export type ActionRecord =
  | { state: 'pending' }
  | { state: 'success'; tx: StoredTx; approvalUrl?: string }
  | { state: 'error'; status: number; code: string; issue?: string; debugId?: string; message: string };

export interface VerifiedWebhookEvent {
  id: string;
  type: string;
  resourceId?: string;
  relatedIds: string[];
  receivedAt: string;
}

export interface WebhookResult {
  duplicate: boolean;
  txId: string | null;
  status?: TxStatus;
}

export interface StoredEvidence {
  id: string;
  submittedBy: 'buyer' | 'seller';
  kind: 'photo' | 'tracking' | 'chat' | 'note';
  content: string;
}

export interface StoredRecommendation {
  txId: string;
  aiSummary: AiSummary | null;
  ruleId: RuleId | 'NONE';
  action: RuleAction;
  reasons: string[];
  requiresHuman: boolean;
  createdAt: string;
}

function transaction<T>(db: DatabaseSync, work: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function fromRow(row: Record<string, unknown>): StoredTx {
  return {
    id: String(row.id),
    status: row.status as TxStatus,
    captured: Boolean(row.captured),
    ...(row.frozen_from ? { frozenFrom: String(row.frozen_from) as TxStatus } : {}),
    ...(row.ship_by ? { shipBy: String(row.ship_by) } : {}),
    ...(row.inspection_until ? { inspectionUntil: String(row.inspection_until) } : {}),
    buyerId: String(row.buyer_id),
    sellerId: String(row.seller_id),
    item: String(row.item),
    amount: String(row.amount),
    currency: String(row.currency),
    termsJson: String(row.terms_json),
    ...(row.terms_hash ? { termsHash: String(row.terms_hash) } : {}),
    ...(row.paypal_order_id ? { paypalOrderId: String(row.paypal_order_id) } : {}),
    ...(row.paypal_auth_id ? { paypalAuthId: String(row.paypal_auth_id) } : {}),
    ...(row.paypal_capture_id ? { paypalCaptureId: String(row.paypal_capture_id) } : {}),
    ...(row.evidence_until ? { evidenceUntil: String(row.evidence_until) } : {}),
    ...(row.tracking_number ? { trackingNumber: String(row.tracking_number) } : {}),
  };
}

export class TransactionRepository {
  constructor(private readonly db: DatabaseSync) {}

  loadTransaction(id: string): StoredTx | null {
    const row = this.db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    return row ? fromRow(row) : null;
  }

  insertTransaction(tx: StoredTx): void {
    this.db.prepare(`INSERT INTO transactions (
      id, status, buyer_id, seller_id, item, amount, currency, terms_json, terms_hash,
      ship_by, inspection_until, evidence_until, tracking_number,
      paypal_order_id, paypal_auth_id, paypal_capture_id, captured, frozen_from
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      tx.id, tx.status, tx.buyerId, tx.sellerId, tx.item, tx.amount, tx.currency,
      tx.termsJson, tx.termsHash ?? null, tx.shipBy ?? null, tx.inspectionUntil ?? null,
      tx.evidenceUntil ?? null, tx.trackingNumber ?? null,
      tx.paypalOrderId ?? null, tx.paypalAuthId ?? null, tx.paypalCaptureId ?? null,
      tx.captured ? 1 : 0, tx.frozenFrom ?? null,
    );
  }

  readEvents(txId: string): AuditEvent[] {
    return this.db.prepare('SELECT * FROM events WHERE tx_id = ? ORDER BY seq').all(txId).map((row) => ({
      seq: Number(row.seq),
      txId: String(row.tx_id),
      ts: String(row.ts),
      actor: String(row.actor),
      type: String(row.type),
      payload: JSON.parse(String(row.payload_json)) as Record<string, unknown>,
      prevHash: String(row.prev_hash),
      hash: String(row.hash),
    }));
  }

  private appendInTransaction(input: AuditEventInput): AuditEvent {
    const event = appendEvent(this.readEvents(input.txId), input);
    this.db.prepare(`INSERT INTO events (id, tx_id, seq, ts, actor, type, payload_json, prev_hash, hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      randomUUID(), event.txId, event.seq, event.ts, event.actor, event.type,
      JSON.stringify(event.payload), event.prevHash, event.hash,
    );
    return event;
  }

  appendAuditEvent(input: AuditEventInput): AuditEvent {
    return transaction(this.db, () => this.appendInTransaction(input));
  }

  processVerifiedWebhook(event: VerifiedWebhookEvent): WebhookResult {
    return transaction(this.db, () => {
      if (this.db.prepare('SELECT 1 FROM paypal_events WHERE event_id = ?').get(event.id)) {
        return { duplicate: true, txId: null };
      }
      const found = new Set<string>();
      for (const id of new Set(event.relatedIds)) {
        const rows = this.db.prepare(`SELECT id FROM transactions
          WHERE paypal_order_id = ? OR paypal_auth_id = ? OR paypal_capture_id = ?`).all(id, id, id);
        for (const row of rows) found.add(String(row.id));
      }
      // A resolved dispute may carry only its dispute id, so retain the mapping from
      // the previously verified creation notification.
      if (event.type === 'CUSTOMER.DISPUTE.RESOLVED' && event.resourceId) {
        const rows = this.db.prepare(`SELECT tx_id FROM paypal_events
          WHERE type = 'CUSTOMER.DISPUTE.CREATED' AND resource_id = ? AND tx_id IS NOT NULL`).all(event.resourceId);
        for (const row of rows) found.add(String(row.tx_id));
      }
      if (found.size > 1) throw new Error('PayPal webhook maps to multiple transactions');
      const txId = found.values().next().value as string | undefined;
      this.db.prepare(`INSERT INTO paypal_events (event_id, type, tx_id, resource_id, received_at, processed_at)
        VALUES (?, ?, ?, ?, ?, ?)`).run(event.id, event.type, txId ?? null, event.resourceId ?? null, event.receivedAt, event.receivedAt);
      if (!txId) return { duplicate: false, txId: null };

      const tx = this.loadTransaction(txId)!;
      const trigger = event.type === 'CUSTOMER.DISPUTE.CREATED' || event.type === 'PAYMENT.CAPTURE.REVERSED'
        ? { type: 'EXTERNAL_DISPUTE' as const }
        : event.type === 'CUSTOMER.DISPUTE.RESOLVED' ? { type: 'EXTERNAL_RESOLVED' as const } : null;
      const changed = trigger ? transition(tx, trigger) : null;
      if (changed?.ok) {
        const update = this.db.prepare(`UPDATE transactions SET status = ?, frozen_from = ?, updated_at = datetime('now')
          WHERE id = ? AND status = ?`).run(changed.tx.status, changed.tx.frozenFrom ?? null, txId, tx.status);
        if (update.changes !== 1) throw new Error('Transaction status changed concurrently');
      }
      this.appendInTransaction({
        txId, ts: event.receivedAt, actor: 'paypal', type: 'PAYPAL_WEBHOOK',
        payload: {
          eventId: event.id, eventType: event.type, resourceId: event.resourceId ?? null,
          from: tx.status, to: changed?.ok ? changed.tx.status : tx.status,
          ...(changed && !changed.ok ? { ignoredReason: changed.code } : {}),
        },
      });
      return { duplicate: false, txId, status: changed?.ok ? changed.tx.status : tx.status };
    });
  }

  createTransaction(tx: StoredTx, event: AuditEventInput): void {
    transaction(this.db, () => {
      this.insertTransaction(tx);
      this.appendInTransaction(event);
    });
  }

  /** Which parties have accepted the terms of a DRAFT transaction. */
  listAcceptances(txId: string): Array<'buyer' | 'seller'> {
    return this.db.prepare('SELECT role FROM term_acceptances WHERE tx_id = ? ORDER BY role').all(txId)
      .map((row) => row.role as 'buyer' | 'seller');
  }

  recordAcceptance(txId: string, role: 'buyer' | 'seller', termsHash: string, ts: string): boolean {
    return transaction(this.db, () => {
      const tx = this.loadTransaction(txId);
      if (!tx || tx.status !== 'DRAFT') throw new Error('Terms can only be accepted in DRAFT');
      const inserted = this.db.prepare(`INSERT OR IGNORE INTO term_acceptances
        (tx_id, role, terms_hash, accepted_at) VALUES (?, ?, ?, ?)`).run(txId, role, termsHash, ts);
      if (inserted.changes) this.appendInTransaction({
        txId, ts, actor: role, type: 'TERMS_ACCEPTED', payload: { termsHash },
      });
      const rows = this.db.prepare('SELECT role, terms_hash FROM term_acceptances WHERE tx_id = ?').all(txId);
      if (rows.some((row) => row.terms_hash !== termsHash)) throw new Error('Terms changed after acceptance');
      return rows.length === 2;
    });
  }

  recordEvidence(input: { txId: string; submittedBy: 'buyer' | 'seller'; kind: string; content: string; contentHash: string; ts: string }): string {
    return transaction(this.db, () => {
      const id = randomUUID();
      this.db.prepare(`INSERT INTO evidence (id, tx_id, submitted_by, kind, content_ref, content_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, input.txId, input.submittedBy, input.kind, input.content, input.contentHash, input.ts);
      this.appendInTransaction({
        txId: input.txId, ts: input.ts, actor: input.submittedBy, type: 'EVIDENCE_SUBMITTED',
        payload: { evidenceId: id, kind: input.kind, contentHash: input.contentHash },
      });
      return id;
    });
  }

  bothSidesSubmitted(txId: string): boolean {
    const row = this.db.prepare('SELECT COUNT(DISTINCT submitted_by) AS count FROM evidence WHERE tx_id = ?').get(txId);
    return Number(row?.count) === 2;
  }

  loadEvidence(txId: string): StoredEvidence[] {
    return this.db.prepare(`SELECT id, submitted_by, kind, content_ref FROM evidence
      WHERE tx_id = ? ORDER BY created_at, id`).all(txId).map((row) => ({
      id: String(row.id), submittedBy: String(row.submitted_by) as StoredEvidence['submittedBy'],
      kind: String(row.kind) as StoredEvidence['kind'], content: String(row.content_ref),
    }));
  }

  loadRecommendation(txId: string): StoredRecommendation | null {
    const row = this.db.prepare(`SELECT rule_id, action, reasons_json, requires_human,
      ai_summary_json, created_at FROM decisions WHERE tx_id = ? AND rule_id <> 'HUMAN_REVIEW'
      LIMIT 1`).get(txId);
    if (!row) return null;
    return {
      txId, ruleId: String(row.rule_id) as StoredRecommendation['ruleId'],
      action: String(row.action) as RuleAction,
      reasons: JSON.parse(String(row.reasons_json)) as string[],
      requiresHuman: Boolean(row.requires_human),
      aiSummary: row.ai_summary_json ? JSON.parse(String(row.ai_summary_json)) as AiSummary : null,
      createdAt: String(row.created_at),
    };
  }

  saveRecommendation(txId: string, aiSummary: AiSummary | null, decision: RuleDecision, ts: string): StoredRecommendation {
    return transaction(this.db, () => {
      const existing = this.loadRecommendation(txId);
      if (existing) return existing;
      const tx = this.loadTransaction(txId);
      if (!tx || tx.status !== 'UNDER_REVIEW') throw new Error('Recommendation requires UNDER_REVIEW');
      this.db.prepare(`INSERT INTO decisions
        (id, tx_id, rule_id, outcome, ai_summary_json, action, reasons_json, requires_human, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        randomUUID(), txId, decision.rule, decision.action,
        aiSummary ? JSON.stringify(aiSummary) : null, decision.action,
        JSON.stringify(decision.reasons), decision.requiresHuman ? 1 : 0, ts,
      );
      this.appendInTransaction({
        txId, ts, actor: 'system', type: 'RECOMMENDATION_RECORDED',
        payload: {
          ruleId: decision.rule, action: decision.action, reasons: decision.reasons,
          requiresHuman: decision.requiresHuman, aiSummary,
        },
      });
      return this.loadRecommendation(txId)!;
    });
  }

  hasPendingSplit(txId: string): boolean {
    return !!this.db.prepare(`SELECT 1 FROM decisions WHERE tx_id = ?
      AND rule_id = 'HUMAN_REVIEW' AND outcome = 'SPLIT' LIMIT 1`).get(txId);
  }

  recordPendingSplit(txId: string, reviewerId: string, reason: string, ts: string): void {
    transaction(this.db, () => {
      if (this.hasPendingSplit(txId)) return;
      const tx = this.loadTransaction(txId);
      if (!tx || tx.status !== 'UNDER_REVIEW') throw new Error('Split requires UNDER_REVIEW');
      this.db.prepare(`INSERT INTO decisions
        (id, tx_id, rule_id, outcome, reviewer_id, reason, created_at)
        VALUES (?, ?, 'HUMAN_REVIEW', 'SPLIT', ?, ?, ?)`).run(
        randomUUID(), txId, reviewerId, reason, ts,
      );
      this.appendInTransaction({
        txId, ts, actor: reviewerId, type: 'HUMAN_SPLIT_PENDING',
        payload: { reason, fundsMoved: false },
      });
    });
  }

  listDue(status: TxStatus, column: 'ship_by' | 'inspection_until' | 'evidence_until', now: string): StoredTx[] {
    return this.db.prepare(`SELECT * FROM transactions WHERE status = ? AND ${column} <= ?`)
      .all(status, now).map(fromRow);
  }

  /** Most recently updated first; used by the UI lists. */
  listTransactions(limit = 200): StoredTx[] {
    return this.db.prepare('SELECT * FROM transactions ORDER BY updated_at DESC, created_at DESC LIMIT ?')
      .all(limit).map(fromRow);
  }

  listByStatus(status: TxStatus): StoredTx[] {
    return this.db.prepare('SELECT * FROM transactions WHERE status = ?').all(status).map(fromRow);
  }

  getAction(requestId: string): ActionRecord | null {
    const row = this.db.prepare('SELECT result FROM idempotency WHERE key = ?').get(requestId);
    return row ? JSON.parse(String(row.result)) as ActionRecord : null;
  }

  claimAction(txId: string, action: string, requestId: string): { claimed: boolean; record: ActionRecord } {
    return transaction(this.db, () => {
      const existing = this.getAction(requestId);
      if (existing) return { claimed: false, record: existing };
      this.db.prepare('INSERT INTO idempotency (key, tx_id, action, result) VALUES (?, ?, ?, ?)')
        .run(requestId, txId, action, JSON.stringify({ state: 'pending' }));
      return { claimed: true, record: { state: 'pending' } };
    });
  }

  saveTransition(
    before: StoredTx,
    next: Tx,
    ids: Partial<Pick<StoredTx, 'paypalOrderId' | 'paypalAuthId' | 'paypalCaptureId'>>,
    event: AuditEventInput,
    requestId?: string,
    approvalUrl?: string,
    extras: TransitionExtras = {},
  ): StoredTx {
    return transaction(this.db, () => {
      const result = this.db.prepare(`UPDATE transactions SET status = ?, captured = ?, frozen_from = ?,
        paypal_order_id = ?, paypal_auth_id = ?, paypal_capture_id = ?,
        terms_hash = ?, ship_by = ?, tracking_number = ?, inspection_until = ?, evidence_until = ?,
        updated_at = datetime('now')
        WHERE id = ? AND status = ?`).run(
        next.status, next.captured ? 1 : 0, next.frozenFrom ?? null,
        ids.paypalOrderId ?? before.paypalOrderId ?? null,
        ids.paypalAuthId ?? before.paypalAuthId ?? null,
        ids.paypalCaptureId ?? before.paypalCaptureId ?? null,
        extras.termsHash ?? before.termsHash ?? null,
        extras.shipBy ?? before.shipBy ?? null,
        extras.trackingNumber ?? before.trackingNumber ?? null,
        extras.inspectionUntil ?? before.inspectionUntil ?? null,
        extras.evidenceUntil ?? before.evidenceUntil ?? null,
        before.id, before.status,
      );
      if (result.changes !== 1) throw new Error('Transaction status changed concurrently');
      this.appendInTransaction(event);
      if (extras.decision) this.db.prepare(`INSERT INTO decisions
        (id, tx_id, rule_id, outcome, reviewer_id, reason, created_at)
        VALUES (?, ?, 'HUMAN_REVIEW', ?, ?, ?, ?)`).run(
        randomUUID(), before.id, extras.decision.outcome,
        extras.decision.reviewerId, extras.decision.reason, event.ts,
      );
      const saved = this.loadTransaction(before.id)!;
      if (requestId) {
        const updated = this.db.prepare('UPDATE idempotency SET result = ? WHERE key = ? AND result = ?')
          .run(JSON.stringify({ state: 'success', tx: saved, approvalUrl }), requestId, JSON.stringify({ state: 'pending' }));
        if (updated.changes !== 1) throw new Error('Action claim was lost');
      }
      return saved;
    });
  }

  /** Finish a claimed PayPal call that does not change the transaction status. */
  saveSideEffect(requestId: string, txId: string, event: AuditEventInput): void {
    transaction(this.db, () => {
      const updated = this.db.prepare('UPDATE idempotency SET result = ? WHERE key = ? AND result = ?')
        .run(JSON.stringify({ state: 'success', tx: this.loadTransaction(txId) }), requestId, JSON.stringify({ state: 'pending' }));
      if (updated.changes !== 1) throw new Error('Action claim was lost');
      this.appendInTransaction(event);
    });
  }

  savePayPalFailure(requestId: string, error: ActionRecord & { state: 'error' }, event: AuditEventInput): void {
    transaction(this.db, () => {
      const updated = this.db.prepare('UPDATE idempotency SET result = ? WHERE key = ? AND result = ?')
        .run(JSON.stringify(error), requestId, JSON.stringify({ state: 'pending' }));
      if (updated.changes !== 1) throw new Error('Action claim was lost');
      this.appendInTransaction(event);
    });
  }
}
