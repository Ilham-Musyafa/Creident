import type { DeadlineCueData } from './deadlineCue';

/** A quiet, non-interactive note; thresholds and wording live in the pure helper. */
export function DeadlineCue({ cue }: { cue?: DeadlineCueData | null }) {
  if (!cue) return null;
  return <span role="note" aria-label={cue.accessibleLabel} data-deadline-cue={cue.strength}
    className={`ml-1 inline-flex rounded-full bg-[var(--warning-bg)] px-2 py-0.5 align-baseline text-xs text-[var(--warning-text)] ${cue.strength === 'strong' ? 'font-extrabold ring-1 ring-inset ring-[var(--warning-line)]' : 'font-semibold'}`}>
    {cue.label}
  </span>;
}
