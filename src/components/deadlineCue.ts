import type { TxStatus } from '../lib/domain/types';
import { isActive } from './view';

const HOUR = 60 * 60 * 1000;
const DUE_SOON = 24 * HOUR;
const STRONG_CUE = 6 * HOUR;
export interface DeadlineCueData {
  label: 'Due soon'; strength: 'normal' | 'strong'; accessibleLabel: string;
}

/** Presentation only: never change a deadline or turn a waiting role into an action. */
export function deadlineCue({ deadline, now, status, needsAction, timeLeftLabel }: {
  deadline: number | null; now: string; status: TxStatus; needsAction: boolean; timeLeftLabel: string | null;
}): DeadlineCueData | null {
  if (!needsAction || !isActive(status) || deadline === null || !timeLeftLabel) return null;
  const remaining = deadline - Date.parse(now);
  // A passed deadline is not "soon"; keep its existing expired wording.
  if (!Number.isFinite(remaining) || remaining <= 0 || remaining >= DUE_SOON) return null;
  return { label: 'Due soon', strength: remaining < STRONG_CUE ? 'strong' : 'normal', accessibleLabel: `Due soon, ${timeLeftLabel}` };
}
