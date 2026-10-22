import { openDatabase } from '../db';
import { TransactionRepository } from '../repository';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { appendEvent, type AuditEvent } from './chain';
import { createCheckpoint, verifyCheckpoint } from './checkpoint';
import { latestCheckpoint } from './checkpointFiles';

function keys() {
  const pair = generateKeyPairSync('ed25519');
  return { privatePem: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(), publicPem: pair.publicKey.export({ type: 'spki', format: 'pem' }).toString() };
}
function event(chain: AuditEvent[] = [], payload = { sample: true }) {
  return appendEvent(chain, { txId: 'sample', ts: '2026-10-21T00:00:00.000Z', actor: 'system', type: 'SAMPLE', payload });
}
const createdAt = '2026-10-21T00:00:00.000Z';

describe('signed checkpoints', () => {
  it('verifies unchanged and extended chains and identifies a validly rewritten chain', () => {
    const key = keys();
    const original = [event()];
    const checkpoint = createCheckpoint(new Map([['sample', original]]), key.privatePem, createdAt);
    const compare = (events: AuditEvent[]) => verifyCheckpoint(checkpoint, key.publicPem, new Map([['sample', events]]));
    expect(compare(original)).toMatchObject({ valid: true, createdAt, transactions: [{ state: 'unchanged' }] });
    expect(compare([...original, event(original)])).toMatchObject({ valid: true, transactions: [{ state: 'extended' }] });
    expect(compare([event([], { sample: false })])).toMatchObject({ valid: true, transactions: [{ state: 'rewritten' }] });
    expect(compare([])).toMatchObject({ valid: true, transactions: [{ state: 'rewritten' }] });
    expect(verifyCheckpoint(checkpoint, key.publicPem, new Map())).toMatchObject({ valid: true, transactions: [{ state: 'rewritten' }] });
    expect(compare([{ ...original[0]!, payload: { sample: false } }])).toMatchObject({ valid: true, transactions: [{ state: 'rewritten' }] });
  });

  it('rejects modified payloads, signatures, wrong keys, and malformed documents', () => {
    const key = keys();
    const chains = new Map([['sample', [event()]]]);
    const checkpoint = createCheckpoint(chains, key.privatePem, createdAt);
    for (const value of [null, { ...checkpoint, createdAt: '2026-10-22T00:00:00.000Z' },
      { ...checkpoint, signature: 'A'.repeat(86) + '==' },
      { ...checkpoint, transactions: [{ ...checkpoint.transactions[0], length: 2 }] }]) {
      expect(verifyCheckpoint(value, key.publicPem, chains).valid).toBe(false);
    }
    expect(verifyCheckpoint(checkpoint, keys().publicPem, chains).valid).toBe(false);
    expect(() => createCheckpoint(new Map([['sample', [{ ...event(), hash: '0'.repeat(64) }]]]), key.privatePem)).toThrow('Audit chain verification failed');
  });

  it('handles empty chains and deals created after the checkpoint', () => {
    const key = keys();
    const checkpoint = createCheckpoint(new Map([['sample', []]]), key.privatePem, createdAt);
    expect(verifyCheckpoint(checkpoint, key.publicPem, new Map([['sample', [event()]], ['new', []]])))
      .toMatchObject({ valid: true, transactions: [{ state: 'extended' }, { state: 'not-checkpointed' }] });
  });

  it('reports missing files and refuses to fall back past an invalid latest checkpoint', () => {
    const directory = mkdtempSync(join(tmpdir(), 'hv-checkpoint-'));
    expect(latestCheckpoint(new Map(), directory)).toMatchObject({ available: false });
    writeFileSync(join(directory, '2026-10-21T00-00-00-000Z.json'), '{}');
    expect(latestCheckpoint(new Map(), directory)).toMatchObject({ available: false, message: 'The key to check the sealed copy is missing.' });
    writeFileSync(join(directory, 'public-key.pem'), keys().publicPem);
    expect(latestCheckpoint(new Map(), directory)).toMatchObject({ available: true, result: { valid: false } });
  });
});

describe('checkpoint CLI', () => {
  const script = resolve('scripts/checkpoint.ts');
  it('generates throwaway keys without writing the private key, then signs a database snapshot', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'hv-checkpoint-cli-'));
    const generated = spawnSync(process.execPath, ['--experimental-strip-types', script, '--generate-key'], { cwd, encoding: 'utf8' });
    expect(generated.status).toBe(0);
    const pem = generated.stdout.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/)?.[0];
    expect(Boolean(pem)).toBe(true);
    expect(readdirSync(join(cwd, 'audit-checkpoints'))).toEqual(['public-key.pem']);
    const db = openDatabase(join(cwd, 'test.sqlite'));
    db.prepare('INSERT INTO users (id, role, display_name) VALUES (?, ?, ?)').run('buyer', 'buyer', 'Demo buyer');
    db.prepare('INSERT INTO users (id, role, display_name) VALUES (?, ?, ?)').run('seller', 'seller', 'Demo seller');
    const repo = new TransactionRepository(db);
    repo.insertTransaction({ id: 'sample', status: 'DRAFT', captured: false, buyerId: 'buyer', sellerId: 'seller', item: 'Synthetic', amount: '10.00', currency: 'USD', termsJson: '{}' });
    repo.appendAuditEvent({ txId: 'sample', ts: createdAt, actor: 'system', type: 'SAMPLE', payload: { sample: true } });
    const chains = new Map([['sample', repo.readEvents('sample')]]);
    db.close();
    const run = spawnSync(process.execPath, ['--experimental-strip-types', script], {
      cwd, encoding: 'utf8', env: { ...process.env, AUDIT_SIGNING_KEY: pem, HALCYVAULT_DB_PATH: join(cwd, 'test.sqlite') },
    });
    expect(run.status).toBe(0);
    expect(run.stdout.includes('PRIVATE KEY')).toBe(false);
    const json = readdirSync(join(cwd, 'audit-checkpoints')).find(name => name.endsWith('.json'))!;
    const value: unknown = JSON.parse(readFileSync(join(cwd, 'audit-checkpoints', json), 'utf8'));
    expect(verifyCheckpoint(value, readFileSync(join(cwd, 'audit-checkpoints/public-key.pem'), 'utf8'), chains).valid).toBe(true);
    const brokenDb = openDatabase(join(cwd, 'test.sqlite'));
    brokenDb.prepare('INSERT INTO events (id, tx_id, seq, ts, actor, type, payload_json, prev_hash, hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('broken', 'sample', 2, createdAt, 'system', 'BROKEN', '{}', '0'.repeat(64), '0'.repeat(64));
    brokenDb.close();
    const failed = spawnSync(process.execPath, ['--experimental-strip-types', script], {
      cwd, encoding: 'utf8', env: { ...process.env, AUDIT_SIGNING_KEY: pem, HALCYVAULT_DB_PATH: join(cwd, 'test.sqlite') },
    });
    expect(failed.status).toBe(1);
    expect(readdirSync(join(cwd, 'audit-checkpoints')).filter(name => name.endsWith('.json'))).toHaveLength(1);
    const rotation = spawnSync(process.execPath, ['--experimental-strip-types', script, '--generate-key'], { cwd, encoding: 'utf8' });
    expect(rotation.status).toBe(1);
    expect(rotation.stdout.includes('PRIVATE KEY')).toBe(false);
  });
});
