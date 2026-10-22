// Integer cents avoid floating-point comparisons for reviewer-entered USD amounts.
export function usdCents(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{1,6}\.\d{2}$/.test(value)) return null;
  const [whole, fraction] = value.split('.');
  return Number(whole) * 100 + Number(fraction);
}
export function validPartialAmount(value: unknown, total: unknown): value is string {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,5})\.\d{2}$/.test(value)) return false;
  const cents = usdCents(value); const full = usdCents(total);
  return cents !== null && full !== null && cents > 0 && cents < full;
}
