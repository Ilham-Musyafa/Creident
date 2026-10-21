import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrate } from './db';

describe('database migration', () => {
  it('widens an older status check to allow RETURN_REQUESTED and keeps the rows', () => {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT NOT NULL, display_name TEXT NOT NULL);
      INSERT INTO users VALUES ('buyer','buyer','B'),('seller','seller','S');
      CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK (status IN (
          'DRAFT', 'TERMS_LOCKED', 'AWAITING_APPROVAL', 'AUTHORIZED', 'SHIPPED',
          'IN_INSPECTION', 'DISPUTED', 'UNDER_REVIEW', 'FROZEN_EXTERNAL',
          'COMPLETED', 'REFUNDED', 'VOIDED', 'CANCELLED'
        )),
        buyer_id TEXT NOT NULL REFERENCES users(id), seller_id TEXT NOT NULL REFERENCES users(id),
        item TEXT NOT NULL, amount TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
        terms_json TEXT NOT NULL, terms_hash TEXT, ship_by TEXT, inspection_until TEXT,
        paypal_order_id TEXT UNIQUE, paypal_auth_id TEXT UNIQUE, paypal_capture_id TEXT UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO transactions (id, status, buyer_id, seller_id, item, amount, terms_json)
        VALUES ('t1', 'UNDER_REVIEW', 'buyer', 'seller', 'Old deal', '10.00', '{}');`);
    migrate(db);
    db.prepare("UPDATE transactions SET status = 'RETURN_REQUESTED', return_by = '2026-11-01T00:00:00Z' WHERE id = 't1'").run();
    expect(db.prepare("SELECT status, item, return_by FROM transactions WHERE id = 't1'").get())
      .toMatchObject({ status: 'RETURN_REQUESTED', item: 'Old deal', return_by: '2026-11-01T00:00:00Z' });
    expect(() => db.prepare("UPDATE transactions SET status = 'NOT_A_STATUS'").run()).toThrow();
    migrate(db);
    expect(db.prepare('PRAGMA foreign_key_check').all()).toHaveLength(0);
  });
});
