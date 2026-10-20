import { describe, expect, it } from 'vitest';
import { verifyChain } from './audit/chain';
import { openDatabase } from './db';
import { seedDemoData } from './demoSeed';
import { TransactionRepository } from './repository';

function setup() {
  const db = openDatabase(':memory:');
  const insert = db.prepare('INSERT INTO users (id, role, display_name) VALUES (?, ?, ?)');
  for (const role of ['buyer', 'seller', 'reviewer']) insert.run(role, role, `Demo ${role}`);
  return { db, repo: new TransactionRepository(db) };
}

const time = { shipByDays: 3, inspectionDays: 2, evidenceDays: 2 };

describe('demo seed', () => {
  it('creates labelled demo transactions across the main statuses with valid audit chains', async () => {
    const { repo } = setup();
    const reviewed: string[] = [];
    const result = await seedDemoData({ repo, time, onUnderReview: async (id) => { reviewed.push(id); } });
    expect(result).toEqual({ created: 10, skipped: false });

    const all = repo.listTransactions();
    expect(new Set(all.map((tx) => tx.status))).toEqual(new Set([
      'DRAFT', 'AWAITING_APPROVAL', 'AUTHORIZED', 'IN_INSPECTION', 'DISPUTED',
      'UNDER_REVIEW', 'COMPLETED', 'VOIDED', 'FROZEN_EXTERNAL', 'CANCELLED',
    ]));
    for (const tx of all) {
      expect(tx.item.startsWith('[Demo]')).toBe(true);
      expect(JSON.parse(tx.termsJson).demo).toBe(true);
      expect(verifyChain(repo.readEvents(tx.id)).ok).toBe(true);
    }
    expect(reviewed).toHaveLength(1);
    const completed = all.find((tx) => tx.status === 'COMPLETED')!;
    expect(completed.paypalCaptureId).toMatch(/^DEMO-CAPTURE-/);
    expect(repo.readEvents(completed.id).some((e) => e.payload.simulated === true)).toBe(true);
  });

  it('does not seed twice', async () => {
    const { repo } = setup();
    await seedDemoData({ repo, time });
    expect(await seedDemoData({ repo, time })).toEqual({ created: 0, skipped: true });
    expect(repo.listTransactions()).toHaveLength(10);
  });
});

describe('demo seed with the review pipeline', () => {
  it('produces AI findings for the seeded dispute from the recorded replay case', async () => {
    const { repo } = setup();
    const { prepareReview } = await import('./reviewPipeline');
    await seedDemoData({ repo, time, onUnderReview: (id) => prepareReview(id, { repo, aiEnv: {} }) });
    const review = repo.listTransactions().find((tx) => tx.status === 'UNDER_REVIEW')!;
    const rec = repo.loadRecommendation(review.id)!;
    expect(rec.aiSummary?.findings.map((f) => f.supports)).toEqual(['buyer', 'unclear']);
    expect(rec.ruleId).toBe('R5');
    expect(rec.requiresHuman).toBe(true);
  });
});
