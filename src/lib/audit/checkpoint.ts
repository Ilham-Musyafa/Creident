import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { canonicalJson, GENESIS_HASH, verifyChain, type AuditEvent } from './chain.ts';

export interface ChainHead { txId: string; length: number; headHash: string }
export interface Checkpoint { createdAt: string; transactions: ChainHead[]; signature: string }
export type CheckpointState = 'unchanged' | 'extended' | 'rewritten' | 'not-checkpointed';
export type CheckpointVerification =
  | { valid: false; reason: string }
  | { valid: true; createdAt: string; transactions: Array<ChainHead & { state: CheckpointState }> };
export type AuditChains = ReadonlyMap<string, readonly AuditEvent[]>;

function heads(chains: AuditChains): ChainHead[] {
  return [...chains].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([txId, events]) => {
    const result = verifyChain(events);
    if (!result.ok || events.some(event => event.txId !== txId)) throw new Error('Audit chain verification failed');
    return { txId, length: result.length, headHash: result.head };
  });
}

/** The signature covers exactly the canonical createdAt + transactions payload. */
export function createCheckpoint(chains: AuditChains, privatePem: string, createdAt = new Date().toISOString()): Checkpoint {
  const key = createPrivateKey(privatePem);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('An Ed25519 signing key is required');
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error('Invalid checkpoint time');
  const payload = { createdAt, transactions: heads(chains) };
  return { ...payload, signature: sign(null, Buffer.from(canonicalJson(payload)), key).toString('base64') };
}

function isCheckpoint(value: unknown): value is Checkpoint {
  if (!value || typeof value !== 'object') return false;
  const c = value as Checkpoint;
  if (Object.keys(c).sort().join(',') !== 'createdAt,signature,transactions' || typeof c.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(c.createdAt)) || typeof c.signature !== 'string' ||
      !/^[A-Za-z0-9+/]{86}==$/.test(c.signature) || !Array.isArray(c.transactions)) return false;
  const ids = new Set<string>();
  return c.transactions.every(h => {
    if (!h || Object.keys(h).sort().join(',') !== 'headHash,length,txId' || typeof h.txId !== 'string' || !h.txId ||
        !Number.isSafeInteger(h.length) || h.length < 0 || typeof h.headHash !== 'string' || !/^[0-9a-f]{64}$/.test(h.headHash) || ids.has(h.txId)) return false;
    ids.add(h.txId);
    return h.length !== 0 || h.headHash === GENESIS_HASH;
  });
}

export function verifyCheckpoint(value: unknown, publicPem: string, chains: AuditChains): CheckpointVerification {
  if (!isCheckpoint(value)) return { valid: false, reason: 'Invalid checkpoint format' };
  try {
    const key = createPublicKey(publicPem);
    if (key.asymmetricKeyType !== 'ed25519' || !verify(null,
      Buffer.from(canonicalJson({ createdAt: value.createdAt, transactions: value.transactions })),
      key, Buffer.from(value.signature, 'base64'))) return { valid: false, reason: 'Checkpoint signature verification failed' };
  } catch { return { valid: false, reason: 'Checkpoint signature verification failed' }; }
  const transactions: Array<ChainHead & { state: CheckpointState }> = value.transactions.map(head => {
    const events = chains.get(head.txId);
    const validChain = events && verifyChain(events).ok && events.every(e => e.txId === head.txId);
    const oldHeadPresent = events && (head.length === 0 || events[head.length - 1]?.hash === head.headHash);
    const state: CheckpointState = !validChain || !oldHeadPresent || events.length < head.length ? 'rewritten'
      : events.length === head.length ? 'unchanged' : 'extended';
    return { ...head, state };
  });
  for (const [txId, events] of chains) {
    if (!value.transactions.some(h => h.txId === txId)) transactions.push({
      txId, length: events.length, headHash: events.at(-1)?.hash ?? GENESIS_HASH,
      state: 'not-checkpointed',
    });
  }
  return { valid: true, createdAt: value.createdAt, transactions };
}
