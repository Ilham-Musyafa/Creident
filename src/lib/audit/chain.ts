import { createHash } from 'node:crypto';

// Append-only, hash-chained audit log (docs/DESIGN.md section 7).
// Each event stores the hash of the previous event, so editing, deleting or reordering any
// earlier event breaks every hash after it. This makes tampering detectable, not impossible:
// whoever holds the database can still rewrite the whole chain, which is why the head hash
// should be published somewhere outside the database.

export const GENESIS_HASH = '0'.repeat(64);

export interface AuditEventInput {
  txId: string;
  ts: string;
  actor: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface AuditEvent extends AuditEventInput {
  seq: number;
  prevHash: string;
  hash: string;
}

/** JSON with object keys sorted at every level, so the same data always hashes the same. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (value === undefined) throw new Error('canonicalJson: undefined is not allowed');
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('canonicalJson: non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

function body(e: Omit<AuditEvent, 'hash' | 'prevHash'>): Record<string, unknown> {
  return { seq: e.seq, txId: e.txId, ts: e.ts, actor: e.actor, type: e.type, payload: e.payload };
}

export function computeHash(prevHash: string, e: Omit<AuditEvent, 'hash' | 'prevHash'>): string {
  return createHash('sha256').update(`${prevHash}\n${canonicalJson(body(e))}`).digest('hex');
}

/** Build the next event for a chain. The caller persists it; existing events are never changed. */
export function appendEvent(chain: readonly AuditEvent[], input: AuditEventInput): AuditEvent {
  const last = chain[chain.length - 1];
  const seq = last ? last.seq + 1 : 1;
  const prevHash = last ? last.hash : GENESIS_HASH;
  const draft = { ...input, seq };
  return { ...draft, prevHash, hash: computeHash(prevHash, draft) };
}

export type VerifyResult =
  | { ok: true; head: string; length: number }
  | { ok: false; brokenAtSeq: number; reason: string };

export function verifyChain(events: readonly AuditEvent[]): VerifyResult {
  let prevHash = GENESIS_HASH;
  for (let i = 0; i < events.length; i++) {
    const e = events[i]!;
    const expectedSeq = i + 1;
    if (e.seq !== expectedSeq) return { ok: false, brokenAtSeq: expectedSeq, reason: `expected seq ${expectedSeq}, found ${e.seq}` };
    if (e.prevHash !== prevHash) return { ok: false, brokenAtSeq: e.seq, reason: 'prevHash does not match the previous event' };
    if (computeHash(prevHash, e) !== e.hash) return { ok: false, brokenAtSeq: e.seq, reason: 'hash does not match the event content' };
    prevHash = e.hash;
  }
  return { ok: true, head: prevHash, length: events.length };
}
