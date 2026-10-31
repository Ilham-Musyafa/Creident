import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { timelinePresentation } from './timelinePresentation';
import { Timeline } from './ui';
import { timelineFor } from './view';

describe('Responsive timeline copy', () => {
  it('shortens only the approval node and retains its full wording for description and assistive text', () => {
    const step = { title: 'Payment approved — not charged yet', detail: 'Waiting for the buyer', state: 'current' as const };
    expect(timelinePresentation(step)).toEqual({ title: 'Payment approved', description: 'Payment approved — not charged yet. Waiting for the buyer', accessibleLabel: 'Payment approved — not charged yet. Waiting for the buyer' });
    expect(step.title).toBe('Payment approved — not charged yet');
  });
  it('retains other titles and handles absent descriptions without empty text', () => {
    expect(timelinePresentation({ title: 'Shipped', state: 'done' })).toEqual({ title: 'Shipped', description: undefined, accessibleLabel: 'Shipped' });
  });
  it('shows one shared current description, with other descriptions in tooltips and the original mobile text retained', () => {
    const html = renderToStaticMarkup(createElement(Timeline, { steps: timelineFor('AUTHORIZED'), responsive: true, showCurrentLabel: true }));
    expect((html.match(/timeline-current-description/g) ?? [])).toHaveLength(1);
    expect(html).toContain('title="Agreed. Both sides accepted the same terms"');
    expect(html).toContain('aria-label="Agreed. Both sides accepted the same terms"');
    expect(html).toContain('class="lg:hidden">Payment approved — not charged yet');
    expect(html).toContain('class="hidden lg:inline">Payment approved');
  });
  it('does not add a current description when all steps are finished, or to the nonresponsive timeline', () => {
    expect(renderToStaticMarkup(createElement(Timeline, { steps: timelineFor('COMPLETED'), responsive: true }))).not.toContain('timeline-current-description');
    expect(renderToStaticMarkup(createElement(Timeline, { steps: timelineFor('AUTHORIZED') }))).not.toContain('timeline-current-description');
  });
});
