import type { Step } from './view';

/** Short desktop node label; the full approval wording stays in descriptions and labels. */
export function timelinePresentation(step: Step) {
  const approval = step.title === 'Payment approved — not charged yet';
  return {
    title: approval ? 'Payment approved' : step.title,
    description: approval ? `${step.title}${step.detail ? `. ${step.detail}` : ''}` : step.detail,
    accessibleLabel: `${step.title}${step.detail ? `. ${step.detail}` : ''}`,
  };
}
