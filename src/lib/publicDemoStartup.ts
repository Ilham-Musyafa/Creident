// Public demo start-up: refuse to start with an unsafe environment, then load the labelled
// demo deals (the hosted disk is wiped on every restart). Does nothing unless PUBLIC_DEMO=1.
import { getApiContext } from '../app/api/_shared/context';
import { seedDemoData } from './demoSeed';
import { isPublicDemo, publicDemoProblems } from './publicDemo';
import { prepareReview } from './reviewPipeline';

export async function startPublicDemo(): Promise<void> {
  if (!isPublicDemo()) return;
  const problems = publicDemoProblems();
  if (problems.length) {
    // Exit instead of serving error pages, so the host marks the deploy as failed.
    console.error(`[public demo] refusing to start: ${problems.join('; ')}`);
    process.exit(1);
  }
  const context = getApiContext();
  const result = await seedDemoData({ repo: context.repo, time: context.time, now: context.now, onUnderReview: (txId) => prepareReview(txId, context) });
  console.info(`[public demo] demo deals ready (${result.created} created)`);
}
