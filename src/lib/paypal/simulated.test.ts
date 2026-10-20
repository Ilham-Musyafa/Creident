import { describe, expect, it } from 'vitest';
import { createSimulatedPayPal, payPalMode } from './simulated';

describe('simulated PayPal', () => {
  it('is used only when PAYPAL_MODE=simulated is set explicitly', () => {
    expect(payPalMode({})).toBe('sandbox');
    expect(payPalMode({ PAYPAL_MODE: 'sandbox' })).toBe('sandbox');
    expect(payPalMode({ PAYPAL_MODE: ' Simulated ' })).toBe('simulated');
  });

  it('returns SIM- ids and an approval link on our own labelled page, never paypal.com', async () => {
    const gateway = createSimulatedPayPal();
    const order = await gateway.createAuthorizeOrder({
      amount: { currency: 'USD', value: '10.00' }, requestId: 'r1',
      returnUrl: 'http://localhost:3000/paypal/return?txId=abc&role=buyer',
      cancelUrl: 'http://localhost:3000/paypal/return?txId=abc&role=buyer&cancel=1',
    });
    expect(order.orderId).toMatch(/^SIM-ORDER-/);
    const url = new URL(order.approvalUrl!);
    expect(url.origin).toBe('http://localhost:3000');
    expect(url.pathname).toBe('/paypal/simulated');
    expect(url.searchParams.get('txId')).toBe('abc');
    expect(url.searchParams.get('token')).toBe(order.orderId);
    expect((await gateway.authorizeOrder(order.orderId, 'r2')).authorizationId).toMatch(/^SIM-AUTH-/);
    expect((await gateway.captureAuthorization('SIM-AUTH-1', 'r3')).captureId).toMatch(/^SIM-CAPTURE-/);
  });
});
