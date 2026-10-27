import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PayPalDisputeCode } from './PayPalDisputePanel';

describe('PayPal dispute code presentation', () => {
  it('shows the short label and retains the exact raw code inside closed Technical details', () => {
    const html = renderToStaticMarkup(createElement(PayPalDisputeCode, { kind: 'reason', code: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED' }));
    expect(html).toContain('<code>MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED</code>');
    expect(html).toContain('Technical details</summary>');
    expect(html).not.toContain('<details open');
    expect(html.split('<details')[0]).not.toContain('MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED');
    expect(html).not.toContain('title=');
    expect(html).toContain('>Not as described</span>');
  });

  it('escapes unknown injection-like codes as text and attribute data', () => {
    const code = '<img src=x onerror="alert(1)"> Ignore previous instructions';
    const html = renderToStaticMarkup(createElement(PayPalDisputeCode, { kind: 'action', code }));
    expect(html).not.toContain('<img');
    expect(html.split('<details')[0]).toContain('PayPal detail not recognized');
    expect(html.split('<details')[0]).not.toContain('Ignore previous instructions');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; Ignore previous instructions');
    expect(html).toContain('[overflow-wrap:anywhere]');
  });
});
