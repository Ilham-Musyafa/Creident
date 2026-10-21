import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { verifyCheckpoint, type AuditChains, type CheckpointVerification } from './checkpoint';

export type PublishedCheckpoint = { available: false; message: string } | { available: true; result: CheckpointVerification };

// Published files are read at runtime from the repository, not bundled as application source.
export function latestCheckpoint(chains: AuditChains, directory = join(process.cwd(), 'audit-checkpoints')): PublishedCheckpoint {
  let names: string[];
  try { names = readdirSync(/*turbopackIgnore: true*/ directory).filter(name => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/.test(name)).sort(); }
  catch { return { available: false, message: 'No checkpoint or public key is available.' }; }
  if (!names.length) return { available: false, message: 'No published checkpoint is available.' };
  let publicKey: string;
  try { publicKey = readFileSync(/*turbopackIgnore: true*/ join(/*turbopackIgnore: true*/ directory, 'public-key.pem'), 'utf8'); }
  catch { return { available: false, message: 'No checkpoint public key is available.' }; }
  try {
    const value: unknown = JSON.parse(readFileSync(/*turbopackIgnore: true*/ join(/*turbopackIgnore: true*/ directory, names.at(-1)!), 'utf8'));
    return { available: true, result: verifyCheckpoint(value, publicKey, chains) };
  } catch { return { available: false, message: 'The latest checkpoint could not be read.' }; }
}
