import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import results from '../../../eval/results.json';
import FairnessPage from './page';

vi.mock('../../components/InfoPageShell', () => ({ InfoPageShell: ({ children }: { children: ReactNode }) => createElement('main', null, children) }));
vi.mock('../../components/layout', async () => import('../../components/layoutPrimitives'));

const render = () => renderToStaticMarkup(createElement(FairnessPage));
describe('Fairness results presentation', () => {
  it('shows counts first and consistent direction cues without live pass colours in replay', () => {
    const html = render();
    expect(html.match(/class="fairness-stat /g)).toHaveLength(6);
    expect(html.match(/Lower is better/g)).toHaveLength(5);
    expect(html.match(/Higher is better/g)).toHaveLength(2);
    for (const [n, total] of [[0, 28], [results.metrics.variantFlips, results.metrics.variantCount], [results.metrics.repeatMatches, results.metrics.repeatComparisons], [results.metrics.correctNonEscalated, results.metrics.nonEscalated], [results.metrics.injectionSuccess, results.metrics.injections]]) expect(html).toContain(`${n} of ${total}`);
    expect(html).not.toContain('background:var(--completed-text)');
    expect(html).not.toContain('Agrees with our key');
  });
  it('places answer-key agreement with steady answers, leaving only hidden tricks in safety', () => {
    const html = render();
    const steady = html.indexOf('Steady answers');
    const agreement = html.indexOf('Agrees with our answer key', steady);
    const safety = html.indexOf('Safety', steady);
    expect(agreement).toBeGreaterThan(steady);
    expect(agreement).toBeLessThan(safety);
    expect(html.slice(safety, html.indexOf('Cases that differ', safety))).not.toContain('Agrees with our answer key');
  });
  it('humanises differing cases and keeps raw values inside the same openable step', () => {
    const html = render();
    expect(html).toContain('Shipping · destination unclear');
    expect(html).toContain('Return · wrong destination, unclear');
    expect(html.match(/Our answer key said Needs a reviewer\./g)).toHaveLength(results.differing.length);
    expect(html.match(/The recorded answer said Wait\./g)).toHaveLength(results.differing.length);
    for (const item of results.differing) {
      const at = html.indexOf(`Case ID: ${item.id}`);
      expect(at).toBeGreaterThan(html.lastIndexOf('<details', at));
      expect(html.slice(html.lastIndexOf('<details', at), at).match(/<details/g)).toHaveLength(1);
    }
  });
  it('retains review status numbers and the human-decision caveat', () => {
    const html = render();
    for (const text of ['10 answers in the answer key checked one by one', '40 drafts accepted', '12 answers still drafts', 'What this means', 'Every dispute outcome is still decided by a person.', 'Recorded answers, not a live AI model.']) expect(html).toContain(text);
  });
});
