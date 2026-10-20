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
      ship_by, inspection_until, paypal_order_id, paypal_auth_id, paypal_capture_id,
      captured, frozen_from
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      tx.id, tx.status, tx.buyerId, tx.sellerId, tx.item, tx.amount, tx.currency,
      tx.termsJson, tx.termsHash ?? null, tx.shipBy ?? null, tx.inspectionUntil ?? null,
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
  ): StoredTx {
    return transaction(this.db, () => {
      const result = this.db.prepare(`UPDATE transactions SET status = ?, captured = ?, frozen_from = ?,
        paypal_order_id = ?, paypal_auth_id = ?, paypal_capture_id = ?, updated_at = datetime('now')
        WHERE id = ? AND status = ?`).run(
        next.status, next.captured ? 1 : 0, next.frozenFrom ?? null,
        ids.paypalOrderId ?? before.paypalOrderId ?? null,
        ids.paypalAuthId ?? before.paypalAuthId ?? null,
        ids.paypalCaptureId ?? before.paypalCaptureId ?? null,
        before.id, before.status,
      );
      if (result.changes !== 1) throw new Error('Transaction status changed concurrently');
      this.appendInTransaction(event);
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
