import { createPublicKey, generateKeyPairSync } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openDatabase } from '../src/lib/db.ts';
import { createCheckpoint } from '../src/lib/audit/checkpoint.ts';
import type { AuditEvent } from '../src/lib/audit/chain.ts';

const directory = join(process.cwd(), 'audit-checkpoints');
function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--generate-key') {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    mkdirSync(directory, { recursive: true });
    // Published checkpoints remain bound to their original key.
    if (readdirSync(directory).some(name => name.endsWith('.json'))) {
      throw new Error('Preserve published checkpoints and their key before rotating.');
    }
    writeFileSync(join(directory, 'public-key.pem'), publicPem);
    process.stdout.write('WARNING: Store the private key in .env only as a quoted multiline AUDIT_SIGNING_KEY. Never commit it or redirect this output to a file.\n');
    process.stdout.write('Public key (saved to audit-checkpoints/public-key.pem; commit this file):\n' + publicPem);
    process.stdout.write('Private key (shown once; not saved):\n' + privateKey.export({ type: 'pkcs8', format: 'pem' }).toString());
    return;
  }
  if (args.length) throw new Error('Usage: npm run checkpoint [-- --generate-key]');
  const privatePem = process.env.AUDIT_SIGNING_KEY;
  if (!privatePem) throw new Error('Set AUDIT_SIGNING_KEY in .env before creating a checkpoint.');
  const publicPem = readFileSync(join(directory, 'public-key.pem'), 'utf8');
  if (String(createPublicKey(privatePem).export({ type: 'spki', format: 'pem' })) !==
    String(createPublicKey(publicPem).export({ type: 'spki', format: 'pem' }))) throw new Error('Signing key does not match the published public key.');
  const db = openDatabase();
  try {
    db.exec('BEGIN');
    const chains = new Map<string, AuditEvent[]>();
    for (const row of db.prepare('SELECT id FROM transactions ORDER BY id').all()) {
      const txId = String(row.id);
      chains.set(txId, db.prepare('SELECT * FROM events WHERE tx_id = ? ORDER BY seq').all(txId).map(e => ({
        seq: Number(e.seq), txId: String(e.tx_id), ts: String(e.ts), actor: String(e.actor), type: String(e.type),
        payload: JSON.parse(String(e.payload_json)), prevHash: String(e.prev_hash), hash: String(e.hash),
      })));
    }
    const checkpoint = createCheckpoint(chains, privatePem);
    db.exec('COMMIT');
    mkdirSync(directory, { recursive: true });
    const filename = checkpoint.createdAt.replace(/:/g, '-').replace('.', '-') + '.json';
    writeFileSync(join(directory, filename), JSON.stringify(checkpoint, null, 2) + '\n', { flag: 'wx' });
    process.stdout.write(`Checkpoint written: audit-checkpoints/${filename}. Commit and publish it with the public key outside the database.\n`);
  } finally { db.close(); }
}
try { main(); } catch {
  // Crypto/parser exceptions can include supplied input; never log the error or key.
  process.stderr.write('Checkpoint failed. Check the signing key, public key, audit chains, and output path. No private key was written.\n');
  process.exitCode = 1;
}
