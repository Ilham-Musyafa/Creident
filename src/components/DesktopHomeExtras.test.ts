import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DesktopHomeExtras } from './DesktopHomeExtras';
const render = (showDemo: boolean, recordedAi = true) => renderToStaticMarkup(createElement(DesktopHomeExtras, { activity: [], now: '2026-10-31T00:00:00Z', showDemo, recordedAi }));
describe('Desktop Home extras', () => {
  it('has a plain empty state and hides the demo card outside demo mode', () => {
    const html = render(false);
    expect(html).toContain('No activity yet');
    expect(html).not.toContain('Try the demo');
    expect(html).not.toContain('hv-stagger');
  });
  it('has real guide links and truthful AI-mode wording', () => {
    const html = render(true);
    expect(html).toContain('href="/menu#demo-role"');
    expect(html).toContain('href="/deals"');
    expect(html).toContain('Demo mode: simulated PayPal, recorded AI answers, no real money.');
    expect(html).toContain('AI summarises evidence, a person decides.');
    expect(render(true, false)).toContain('live AI answers');
    expect(render(true, false)).not.toContain('recorded AI answers');
  });
});
