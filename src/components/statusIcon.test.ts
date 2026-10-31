import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { STATUS_ICONS, StatusIcon } from './statusIcon';
import { StatusPill } from './ui';
describe('Status icons supplement labels', () => {
  it('maps waiting, progress, problem, completed and cancellation states', () => {
    expect(STATUS_ICONS.DRAFT).toBe('clock');
    expect(STATUS_ICONS.SHIPPED).toBe('progress');
    expect(STATUS_ICONS.UNDER_REVIEW).toBe('problem');
    expect(STATUS_ICONS.FROZEN_EXTERNAL).toBe('problem');
    expect(STATUS_ICONS.COMPLETED).toBe('check');
    expect(STATUS_ICONS.CANCELLED).toBe('cancel');
    expect(Object.keys(STATUS_ICONS)).toHaveLength(15);
  });
  it('keeps the complete label available for a short pill and hides decorative icons', () => {
    const html = renderToStaticMarkup(createElement(StatusPill, { status: 'FROZEN_EXTERNAL', short: true }));
    expect(html).toContain('title="On hold · PayPal dispute"');
    expect(html).toContain('<span class="sr-only">On hold · PayPal dispute</span>');
    expect(html).toContain('On hold · PayPal');
    expect(html).not.toContain('hv-dot');
    expect(renderToStaticMarkup(createElement(StatusIcon, { status: 'COMPLETED' }))).toContain('aria-hidden="true"');
  });
});
