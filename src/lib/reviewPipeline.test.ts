import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { openDatabase } from './db';
import { TransactionRepository } from './repository';
import { prepareReview } from './reviewPipeline';
import { verifyChain } from './audit/chain';

const db = openDatabase(':memory:');
const repo = new TransactionRepository(db);
for (const role of ['buyer', 'seller'] as const) {
  db.prepare('INSERT INTO users (id, role, display_name) VALUES (?, ?, ?)').run(role, role, `Demo ${role}`);
}

describe('review preparation', () => {
  it('replays the exact synthetic sample with stored evidence ids and records one audited recommendation', async () => {
    const id = randomUUID();
    repo.insertTransaction({
      id, status: 'UNDER_REVIEW', captured: false, buyerId: 'buyer', sellerId: 'seller',
      item: 'Synthetic parcel', amount: '10.00', currency: 'USD',
      termsJson: JSON.stringify({ criteria: ['Delivery to agreed destination'] }),
    });
    repo.recordEvidence({ txId: id, submittedBy: 'buyer', kind: 'note',
      content: 'The sample parcel arrived at the agreed address.', contentHash: 'demo', ts: '2026-10-20T00:00:00.000Z' });
    repo.recordEvidence({ txId: id, submittedBy: 'seller', kind: 'tracking',
      content: 'DEMO-DELIVERED shows delivery to the agreed address.', contentHash: 'demo', ts: '2026-10-20T00:00:00.000Z' });
    const first = await prepareReview(id, { repo, aiEnv: { AI_MODE: 'replay' }, now: () => '2026-10-20T00:00:00.000Z' });
    const second = await prepareReview(id, { repo, aiEnv: { AI_MODE: 'replay' }, now: () => '2026-10-20T00:00:00.000Z' });
    expect(first).toEqual(second);
    expect(first).toMatchObject({ ruleId: 'R4', action: 'RELEASE', requiresHuman: true });
    expect(new Set(first.aiSummary?.findings[0]?.evidenceIds)).toEqual(new Set(repo.loadEvidence(id).map((item) => item.id)));
    expect(db.prepare("SELECT COUNT(*) AS count FROM decisions WHERE tx_id = ? AND rule_id <> 'HUMAN_REVIEW'").get(id)?.count).toBe(1);
    expect(repo.readEvents(id).filter((event) => event.type === 'RECOMMENDATION_RECORDED')).toHaveLength(1);
    expect(verifyChain(repo.readEvents(id)).ok).toBe(true);
    expect(repo.loadTransaction(id)?.status).toBe('UNDER_REVIEW');
  });
});
