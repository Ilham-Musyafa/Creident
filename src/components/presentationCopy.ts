import type { Role } from './view';

export const PAYMENT_ACTION_LABELS: Record<string, string> = {
  RELEASE: 'Charge the buyer (capture)', REFUND: 'Refund the buyer', VOID: 'Cancel the payment',
  ESCALATE_HUMAN: 'Needs a reviewer', FREEZE: 'Put on hold', WAIT: 'Wait',
};
export const AI_REVIEW_NOTE = 'AI only summarises evidence; a human decides.';
export function demoName(role: Role): string { return `Demo ${role[0]!.toUpperCase()}${role.slice(1)}`; }
export function evidenceLabel(side: string, number: number): string { return `${side === 'buyer' ? 'Buyer' : 'Seller'} evidence ${number}`; }
export function evidenceAlias(alias: string): string {
  const match = /^([BS])(\d+)$/.exec(alias);
  return match ? evidenceLabel(match[1] === 'B' ? 'buyer' : 'seller', Number(match[2])) : 'Evidence reference unavailable';
}
