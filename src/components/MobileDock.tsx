'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BottomNav, NavIcon } from './ui';
import type { Role } from './view';
// Five equal columns: two items, the New deal button exactly at the centre, two items.
export function MobileDock({ role, active }: { role: Role; active?: 'Home' | 'Deals' | 'Audit' | 'Menu' }) {
  const pathname = usePathname();
  if (role !== 'seller') return <BottomNav active={active}/>;
  const isNew = pathname === '/deals/new';
  return <nav aria-label="Main navigation" className="mobile-dock seller-dock"><div className="grid grid-cols-5 items-center">
    {([{key:'Home',href:'/',label:'Home'},{key:'Deals',href:'/deals',label:'Transactions'},{key:'New',href:'/deals/new',label:'New deal'},{key:'Menu',href:'/menu',label:'Settings'},{key:'How',href:'/how-it-works',label:'How it works'}] as const).map(item => <Link key={item.key} href={item.href} aria-label={item.label} aria-current={(item.key === 'New' ? isNew : item.key === 'How' ? pathname === '/how-it-works' : active === item.key && !isNew && pathname !== '/how-it-works') ? 'page' : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 text-center text-xs ${item.key === 'New' ? 'seller-create' : ''}`}>
      <span className="grid place-items-center">{item.key === 'New' ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-7"><path d="M12 4v16M4 12h16"/></svg> : item.key === 'How' ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="m9 12 2 2 4-4"/></svg> : <NavIcon name={item.key}/>}</span><span className="text-[11px]">{item.label}</span>
    </Link>)}
  </div></nav>;
}
