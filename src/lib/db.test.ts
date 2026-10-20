import assert from "node:assert/strict";
import { test } from "node:test";
import { openDatabase } from "./db.ts";

test("schema initializes repeatedly and enforces transaction relationships", () => {
  const db = openDatabase(":memory:");
  try {
    db.prepare("INSERT INTO users (id, role, display_name) VALUES (?, ?, ?)").run("buyer", "buyer", "Buyer");
    db.prepare("INSERT INTO users (id, role, display_name) VALUES (?, ?, ?)").run("seller", "seller", "Seller");
    const insert = db.prepare(`INSERT INTO transactions
      (id, status, buyer_id, seller_id, item, amount, terms_json)
      VALUES (?, 'DRAFT', ?, ?, 'Example item', '10.00', '{}')`);
    assert.throws(() => insert.run("bad", "missing", "seller"), /FOREIGN KEY/);
    assert.throws(() => insert.run("same", "buyer", "buyer"), /CHECK constraint/);
    insert.run("tx", "buyer", "seller");
    assert.equal(db.prepare("SELECT status FROM transactions WHERE id = 'tx'").get()?.status, "DRAFT");
    db.prepare(`INSERT INTO paypal_events (event_id, type) VALUES ('event-1', 'PAYMENT.CAPTURE.COMPLETED')`).run();
    assert.throws(() => db.prepare(`INSERT INTO paypal_events (event_id, type) VALUES ('event-1', 'PAYMENT.CAPTURE.COMPLETED')`).run(), /UNIQUE constraint/);
    db.prepare(`INSERT INTO events (id, tx_id, ts, actor, type, payload_json, prev_hash, hash)
      VALUES ('audit-1', 'tx', '2026-10-20T00:00:00Z', 'system', 'created', '{}', '', 'hash-1')`).run();
    assert.throws(() => db.prepare("UPDATE events SET actor = 'other' WHERE id = 'audit-1'").run(), /append-only/);
    assert.throws(() => db.prepare("DELETE FROM events WHERE id = 'audit-1'").run(), /append-only/);
    db.prepare("INSERT INTO idempotency (key, tx_id, action, result) VALUES ('request-1', 'tx', 'capture', '{}')").run();
    assert.throws(() => db.prepare("INSERT INTO idempotency (key, tx_id, action, result) VALUES ('request-1', 'tx', 'capture', '{}')").run(), /UNIQUE constraint/);
    assert.doesNotThrow(() => openDatabase(":memory:").close());
  } finally {
    db.close();
  }
});
