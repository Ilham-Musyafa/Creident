import type { Urgency } from './view';

/** Calm "Due soon" cue for a deadline under 24 hours. The words carry the meaning; colour only adds emphasis. */
export function DueSoon({ urgency, label }: { urgency: Urgency | null; label?: string | null }) {
  if (!urgency) return null;
  const tone = urgency === 'urgent'
    ? { background: 'var(--warning-bg)', color: 'var(--warning-text)', borderColor: 'var(--warning-line)' }
    : { background: 'var(--awaiting-bg)', color: 'var(--awaiting-text)', borderColor: 'transparent' };
  return <span style={tone} className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-bold leading-none">
    Due soon<span className="sr-only">{label ? `, ${label}` : ''}</span>
  </span>;
}
