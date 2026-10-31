import type { CSSProperties } from 'react';
/** Real text remains accessible; the decorative CSS counter runs once and never changes data. */
export function CalmNumber({ value }: { value: number }) {
  return <span className="calm-number" style={{ '--number-target': value } as CSSProperties}><span className="number-value">{value}</span><span aria-hidden="true" className="number-animation"/></span>;
}
