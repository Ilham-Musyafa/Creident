import type { ComponentPropsWithoutRef } from 'react';

/** Shared overlapping mobile surface; the desktop content wrapper stays transparent. */
export function MobilePanel({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={`mobile-panel relative min-h-[70dvh] px-5 pb-5 pt-6 lg:static lg:m-0 lg:min-h-0 lg:rounded-none lg:bg-transparent lg:p-0 ${className}`} {...props}/>;
}
