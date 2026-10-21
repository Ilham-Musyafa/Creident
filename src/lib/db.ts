import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

// This module has no framework imports so the persistence layer can be tested directly.
export function openDatabase(filename = process.env.HALCYVAULT_DB_PATH ?? "data/halcyvault.sqlite"): DatabaseSync {
  if (filename !== ":memory:") {
    const path = resolve(/*turbopackIgnore: true*/ filename);
    mkdirSync(dirname(path), { recursive: true });
    filename = path;
  }

  const db = new DatabaseSync(filename);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  migrate(db);
  return db;
}

/**
 * Older databases have a status CHECK without RETURN_REQUESTED. SQLite cannot change a CHECK
 * in place, so copy the table into the new definition (data and ids are unchanged; the audit
 * events table is not touched).
 */
function widenStatusCheck(db: DatabaseSync): void {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'transactions'").get() as { sql?: string } | undefined;
  if (!row?.sql || row.sql.includes("'RETURN_REQUESTED'")) return;
  const widened = row.sql
    .replace(/CREATE TABLE\s+"?transactions"?/i, 'CREATE TABLE transactions_widened')
    .replace("'UNDER_REVIEW',", "'UNDER_REVIEW', 'RETURN_REQUESTED',");
  if (!widened.includes("'RETURN_REQUESTED'")) throw new Error('Could not widen the transactions status check');
  db.exec('PRAGMA foreign_keys = OFF');
  try {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(widened);
      db.exec('INSERT INTO transactions_widened SELECT * FROM transactions');
      db.exec('DROP TABLE transactions');
      db.exec('ALTER TABLE transactions_widened RENAME TO transactions');
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}

export function migrate(db: DatabaseSync): void {
  widenStatusCheck(db);
  const existingEvents = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'events'").get();
  if (existingEvents) {
    const columns = db.prepare("PRAGMA table_info(events)").all() as { name: string }[];
    if (!columns.some((column) => column.name === "seq")) {
      const count = db.prepare("SELECT COUNT(*) AS count FROM events").get() as { count: number };
      if (count.count !== 0) throw new Error("Existing audit events lack seq; migrate and verify them before opening this database");
      db.exec("DROP TABLE events");
    }
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('buyer', 'seller', 'reviewer')),
      display_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN (
        'DRAFT', 'TERMS_LOCKED', 'AWAITING_APPROVAL', 'AUTHORIZED', 'SHIPPED',
        'IN_INSPECTION', 'DISPUTED', 'UNDER_REVIEW', 'RETURN_REQUESTED', 'FROZEN_EXTERNAL',
        'COMPLETED', 'REFUNDED', 'VOIDED', 'CANCELLED'
      )),
      buyer_id TEXT NOT NULL REFERENCES users(id),
      seller_id TEXT NOT NULL REFERENCES users(id),
      item TEXT NOT NULL,
      amount TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
      terms_json TEXT NOT NULL CHECK (json_valid(terms_json)),
      terms_hash TEXT,
      ship_by TEXT,
      inspection_until TEXT,
      evidence_until TEXT,
      tracking_number TEXT,
      return_by TEXT,
      return_tracking TEXT,
      paypal_order_id TEXT UNIQUE,
      paypal_auth_id TEXT UNIQUE,
      paypal_capture_id TEXT UNIQUE,
      captured INTEGER NOT NULL DEFAULT 0 CHECK (captured IN (0, 1)),
      frozen_from TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (buyer_id <> seller_id)
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      tx_id TEXT NOT NULL REFERENCES transactions(id),
      submitted_by TEXT NOT NULL REFERENCES users(id),
      kind TEXT NOT NULL CHECK (kind IN ('photo', 'tracking', 'chat', 'note')),
      content_ref TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS evidence_tx_id ON evidence(tx_id);

    CREATE TABLE IF NOT EXISTS term_acceptances (
      tx_id TEXT NOT NULL REFERENCES transactions(id),
      role TEXT NOT NULL CHECK (role IN ('buyer', 'seller')),
      terms_hash TEXT NOT NULL,
      accepted_at TEXT NOT NULL,
      PRIMARY KEY (tx_id, role)
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      tx_id TEXT NOT NULL REFERENCES transactions(id),
      rule_id TEXT NOT NULL,
      outcome TEXT NOT NULL,
      ai_summary_json TEXT CHECK (ai_summary_json IS NULL OR json_valid(ai_summary_json)),
      action TEXT,
      reasons_json TEXT CHECK (reasons_json IS NULL OR json_valid(reasons_json)),
      requires_human INTEGER CHECK (requires_human IS NULL OR requires_human IN (0, 1)),
      reviewer_id TEXT REFERENCES users(id),
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS decisions_tx_id ON decisions(tx_id);

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      tx_id TEXT NOT NULL REFERENCES transactions(id),
      seq INTEGER NOT NULL CHECK (seq > 0),
      ts TEXT NOT NULL,
      actor TEXT NOT NULL,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
      prev_hash TEXT NOT NULL,
      hash TEXT NOT NULL UNIQUE,
      UNIQUE (tx_id, seq)
    );
    CREATE INDEX IF NOT EXISTS events_tx_id_ts ON events(tx_id, ts);
    CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events
      BEGIN SELECT RAISE(ABORT, 'audit events are append-only'); END;
    CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events
      BEGIN SELECT RAISE(ABORT, 'audit events are append-only'); END;

    CREATE TABLE IF NOT EXISTS paypal_events (
      event_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      tx_id TEXT REFERENCES transactions(id),
      resource_id TEXT,
      received_at TEXT NOT NULL DEFAULT (datetime('now')),
      processed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS paypal_disputes (
      tx_id TEXT NOT NULL REFERENCES transactions(id),
      dispute_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      stage TEXT NOT NULL,
      reason TEXT NOT NULL,
      actions_json TEXT NOT NULL CHECK (json_valid(actions_json)),
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS paypal_disputes_tx_id ON paypal_disputes(tx_id);

    -- AI drafts (DESIGN 6.1) kept so the app can tell an unchanged draft from an edited one.
    CREATE TABLE IF NOT EXISTS ai_drafts (
      id TEXT PRIMARY KEY,
      tx_id TEXT NOT NULL REFERENCES transactions(id),
      feature TEXT NOT NULL,
      output_json TEXT NOT NULL CHECK (json_valid(output_json)),
      meta_json TEXT NOT NULL CHECK (json_valid(meta_json)),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ai_drafts_tx_id ON ai_drafts(tx_id);

    CREATE TABLE IF NOT EXISTS paypal_dispute_poll_attempts (
      mode TEXT NOT NULL CHECK (mode IN ('sandbox', 'simulated')),
      kind TEXT NOT NULL CHECK (kind IN ('case', 'capture')),
      resource_id TEXT NOT NULL,
      attempt_seq INTEGER NOT NULL CHECK (attempt_seq > 0),
      PRIMARY KEY (mode, kind, resource_id)
    );
    CREATE INDEX IF NOT EXISTS paypal_dispute_poll_attempts_seq ON paypal_dispute_poll_attempts(attempt_seq);

    CREATE TABLE IF NOT EXISTS idempotency (
      key TEXT PRIMARY KEY,
      tx_id TEXT NOT NULL REFERENCES transactions(id),
      action TEXT NOT NULL,
      result TEXT NOT NULL CHECK (json_valid(result))
    );
  `);
  const txColumns = db.prepare('PRAGMA table_info(transactions)').all() as { name: string }[];
  if (!txColumns.some((column) => column.name === 'captured')) {
    db.exec('ALTER TABLE transactions ADD COLUMN captured INTEGER NOT NULL DEFAULT 0 CHECK (captured IN (0, 1))');
    db.exec('UPDATE transactions SET captured = 1 WHERE paypal_capture_id IS NOT NULL');
  }
  if (!txColumns.some((column) => column.name === 'frozen_from')) {
    db.exec('ALTER TABLE transactions ADD COLUMN frozen_from TEXT');
  }
  if (!txColumns.some((column) => column.name === 'evidence_until')) {
    db.exec('ALTER TABLE transactions ADD COLUMN evidence_until TEXT');
  }
  if (!txColumns.some((column) => column.name === 'tracking_number')) {
    db.exec('ALTER TABLE transactions ADD COLUMN tracking_number TEXT');
  }
  if (!txColumns.some((column) => column.name === 'return_by')) {
    db.exec('ALTER TABLE transactions ADD COLUMN return_by TEXT');
  }
  if (!txColumns.some((column) => column.name === 'return_tracking')) {
    db.exec('ALTER TABLE transactions ADD COLUMN return_tracking TEXT');
  }
  const paypalEventColumns = db.prepare('PRAGMA table_info(paypal_events)').all() as { name: string }[];
  if (!paypalEventColumns.some((column) => column.name === 'tx_id')) {
    db.exec('ALTER TABLE paypal_events ADD COLUMN tx_id TEXT REFERENCES transactions(id)');
  }
  if (!paypalEventColumns.some((column) => column.name === 'resource_id')) {
    db.exec('ALTER TABLE paypal_events ADD COLUMN resource_id TEXT');
  }
  const decisionColumns = db.prepare('PRAGMA table_info(decisions)').all() as { name: string }[];
  if (!decisionColumns.some((column) => column.name === 'action')) {
    db.exec('ALTER TABLE decisions ADD COLUMN action TEXT');
  }
  if (!decisionColumns.some((column) => column.name === 'reasons_json')) {
    db.exec('ALTER TABLE decisions ADD COLUMN reasons_json TEXT CHECK (reasons_json IS NULL OR json_valid(reasons_json))');
  }
  if (!decisionColumns.some((column) => column.name === 'requires_human')) {
    db.exec('ALTER TABLE decisions ADD COLUMN requires_human INTEGER CHECK (requires_human IS NULL OR requires_human IN (0, 1))');
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS one_recommendation_per_tx ON decisions(tx_id) WHERE rule_id <> 'HUMAN_REVIEW'");
}
