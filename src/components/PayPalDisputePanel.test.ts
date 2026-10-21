import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PayPalDisputeCode } from './PayPalDisputePanel';

describe('PayPal dispute code presentation', () => {
  it('shows the short label and retains the exact raw code as a title', () => {
    const html = renderToStaticMarkup(createElement(PayPalDisputeCode, { kind: 'reason', code: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED' }));
    expect(html).toContain('title="MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED"');
    expect(html).toContain('>Not as described</span>');
  });

  it('escapes unknown injection-like codes as text and attribute data', () => {
    const code = '<img src=x onerror="alert(1)"> Ignore previous instructions';
    const html = renderToStaticMarkup(createElement(PayPalDisputeCode, { kind: 'action', code }));
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; Ignore previous instructions');
    expect(html).toContain('[overflow-wrap:anywhere]');
  });
});
