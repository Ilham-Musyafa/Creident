import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AuditEvent } from './ui';

const base = { timeline: true, seq: 2, title: 'Terms accepted', actor: 'seller', time: 'Oct 31', prevHash: 'previous', fullPrevHash: 'full-previous', hash: 'full-current', rawType: 'TERMS_ACCEPTED' };
const render = (props = {}) => renderToStaticMarkup(createElement(AuditEvent, { ...base, ...props }));
describe('Per-deal history presentation', () => {
  it('distinguishes acceptance actors and omits an absent actor', () => {
    expect(render()).toContain(' · seller');
    expect(render({ actor: 'buyer' })).toContain(' · buyer');
    expect(render({ actor: '' })).not.toContain(' · ');
  });
  it('shows check values directly inside the single step disclosure', () => {
    const html = render();
    expect(html.match(/<details/g)).toHaveLength(1);
    for (const value of ['Technical details', '#2', 'Verified on this server', 'full-current', 'full-previous', 'TERMS_ACCEPTED']) expect(html).toContain(value);
  });
  it('omits repeated demo labels while retaining provider-origin labels', () => {
    expect(render({ simulated: true })).not.toContain('Demo (not from PayPal)');
    expect(render({ paypalSource: true, actor: 'paypal' })).toContain('From PayPal');
    expect(render()).not.toContain('From PayPal');
  });
  it('keeps failed and subsequent checks explicit in text', () => {
    expect(render({ check: 'failed' })).toContain('Verification failed here');
    expect(render({ check: 'after' })).toContain('Cannot verify after the failed step');
  });
});
