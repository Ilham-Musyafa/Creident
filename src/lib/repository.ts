import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { appendEvent, type AuditEvent, type AuditEventInput } from './audit/chain';
import type { Tx, TxStatus } from './domain/types';

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

  createTransaction(tx: StoredTx, event: AuditEventInput): void {
    transaction(this.db, () => {
      this.insertTransaction(tx);
      this.appendInTransaction(event);
    });
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

  listDue(status: TxStatus, column: 'ship_by' | 'inspection_until' | 'evidence_until', now: string): StoredTx[] {
    return this.db.prepare(`SELECT * FROM transactions WHERE status = ? AND ${column} <= ?`)
      .all(status, now).map(fromRow);
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

  savePayPalFailure(requestId: string, error: ActionRecord & { state: 'error' }, event: AuditEventInput): void {
    transaction(this.db, () => {
      const updated = this.db.prepare('UPDATE idempotency SET result = ? WHERE key = ? AND result = ?')
        .run(JSON.stringify(error), requestId, JSON.stringify({ state: 'pending' }));
      if (updated.changes !== 1) throw new Error('Action claim was lost');
      this.appendInTransaction(event);
    });
  }
}
