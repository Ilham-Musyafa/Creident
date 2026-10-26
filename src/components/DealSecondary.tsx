'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Keep short desktop sidebars in view without trapping a tall PayPal case panel. */
export function DealSecondary({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [fits, setFits] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setFits(element.getBoundingClientRect().height <= window.innerHeight - 48);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('resize', update);
    update();
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, []);
  return <aside ref={ref} aria-label="Deal details" data-fits={fits} className="deal-secondary min-w-0 space-y-4">{children}</aside>;
}
