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
    expect(result).toEqual({ created: 11, skipped: false });

    const all = repo.listTransactions();
    expect(new Set(all.map((tx) => tx.status))).toEqual(new Set([
      'DRAFT', 'AWAITING_APPROVAL', 'AUTHORIZED', 'IN_INSPECTION', 'DISPUTED',
      'UNDER_REVIEW', 'COMPLETED', 'VOIDED', 'FROZEN_EXTERNAL', 'CANCELLED',
    ]));
    for (const tx of all) {
      expect(tx.item.startsWith('[Demo]')).toBe(true);
      expect(JSON.parse(tx.termsJson).demo).toBe(true);
      const events = repo.readEvents(tx.id);
      expect(verifyChain(events).ok).toBe(true);
      const dispute = events.find(e => e.type === 'OPEN_DISPUTE');
      if (dispute) expect(dispute.payload).toMatchObject({ disputeType: 'damaged', simulated: true });
      for (const event of events.filter(e => String(e.payload.effect ?? '').startsWith('PAYPAL_'))) {
        expect(event.payload.simulated).toBe(true);
      }
    }
    expect(reviewed).toHaveLength(2);
    const completed = all.find((tx) => tx.status === 'COMPLETED')!;
    expect(completed.paypalCaptureId).toMatch(/^DEMO-CAPTURE-/);
    const events = repo.readEvents(completed.id);
    const captured = events.findIndex((e) => e.type === 'BUYER_CONFIRM');
    const tracking = events.findIndex((e) => e.type === 'PAYPAL_TRACKING_ADDED');
    expect(captured).toBeGreaterThanOrEqual(0);
    expect(tracking).toBeGreaterThan(captured);
    expect(events[tracking]?.payload).toMatchObject({
      simulated: true, trackingNumber: 'DEMO-DELIVERED', trackerId: expect.stringMatching(/^DEMO-TRACKER-/),
    });
    expect(verifyChain(events).ok).toBe(true);
  });

  it('stores a finished dispute, replay recommendation, and reasoned human refund receipt', async () => {
    const { repo } = setup();
    await seedDemoData({ repo, time });
    const tx = repo.listTransactions().find(tx => tx.item === '[Demo] Damaged smartwatch (resolved)')!;
    expect(tx.status).toBe('VOIDED');
    expect(tx.captured).toBe(false);
    const decision = repo.loadDecisions(tx.id)[0]!;
    expect(decision).toMatchObject({ outcome: 'REFUND', reviewerId: 'reviewer' });
    expect(decision.reason).toContain('buyer photo shows a cracked screen');
    expect(repo.loadRecommendation(tx.id)?.aiSummary?.findings).toHaveLength(2);
    expect(repo.loadEvidence(tx.id).map(e => e.submittedBy).sort()).toEqual(['buyer', 'seller']);
    const events = repo.readEvents(tx.id);
    const recommendation = events.findIndex(e => e.type === 'RECOMMENDATION_RECORDED');
    const decided = events.findIndex(e => e.type === 'DECISION');
    expect(recommendation).toBeGreaterThanOrEqual(0);
    expect(decided).toBeGreaterThan(recommendation);
    expect(events[decided]).toMatchObject({ actor: 'reviewer', payload: { outcome: 'REFUND', reason: decision.reason, simulated: true, effect: 'PAYPAL_VOID' } });
    for (const deal of repo.listTransactions()) expect(verifyChain(repo.readEvents(deal.id)).ok).toBe(true);
  });

  it('adds missing examples without replacing existing demo deals', async () => {
    const { repo } = setup();
    repo.insertTransaction({ id: 'existing-demo', item: '[Demo] Vintage film camera', status: 'DRAFT', captured: false, buyerId: 'buyer', sellerId: 'seller', amount: '85.00', currency: 'USD', termsJson: '{"demo":true}' });
    expect(await seedDemoData({ repo, time })).toEqual({ created: 10, skipped: false });
    expect(repo.listTransactions()).toHaveLength(11);
    expect(repo.loadTransaction('existing-demo')?.status).toBe('DRAFT');
    expect(repo.listTransactions().some(tx => repo.loadDecisions(tx.id).length > 0)).toBe(true);
  });

  it('does not seed twice', async () => {
    const { repo } = setup();
    await seedDemoData({ repo, time });
    expect(await seedDemoData({ repo, time })).toEqual({ created: 0, skipped: true });
    expect(repo.listTransactions()).toHaveLength(11);
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
