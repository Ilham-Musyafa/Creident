// Server-side data access for the pages. Reads only; every change goes through the JSON API.
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { getApiContext } from './api/_shared/context';
import { isRole, type Role } from '../components/view';
import { payPalMode } from '../lib/paypal/simulated';

/** True when money steps use the labelled simulation instead of the PayPal Sandbox. */
export function simulatedPayPal(): boolean {
  return payPalMode() === 'simulated';
}

export async function getRole(): Promise<Role> {
  const value = (await cookies()).get('hv-role')?.value;
  return isRole(value) ? value : 'seller';
}

export function data() {
  return getApiContext();
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function isUuid(id: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(id);
}
