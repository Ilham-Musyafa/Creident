'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BottomNav, NavIcon } from './ui';
import type { Role } from './view';
export function MobileDock({ role, active }: { role: Role; active?: 'Home' | 'Deals' | 'Audit' | 'Menu' }) {
  const pathname = usePathname();
  if (role !== 'seller') return <BottomNav active={active}/>;
  const isNew = pathname === '/deals/new';
  return <nav aria-label="Main navigation" className="mobile-dock seller-dock"><div className="grid grid-cols-5 items-center">
    {([{key:'Home',href:'/',label:'Home'},{key:'Deals',href:'/deals',label:'Transactions'},{key:'New',href:'/deals/new',label:'New deal'},{key:'Audit',href:'/audit',label:'Deal history'},{key:'Menu',href:'/menu',label:'Settings'}] as const).map(item => <Link key={item.key} href={item.href} aria-label={item.label} aria-current={(item.key === 'New' ? isNew : active === item.key && !isNew) ? 'page' : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 text-center text-xs ${item.key === 'New' ? 'seller-create' : ''}`}>
      <span className="grid place-items-center">{item.key === 'New' ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-7"><path d="M12 4v16M4 12h16"/></svg> : <NavIcon name={item.key}/>}</span><span className="text-[11px]">{item.label}</span>
    </Link>)}
  </div></nav>;
}
