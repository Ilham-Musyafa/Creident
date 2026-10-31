'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavIcon } from './ui';
import { JoinDeal } from './JoinDeal';
import type { Role } from './view';
// Five equal columns: two items, one centre item, two items. Centre = New deal (seller), Join a deal (buyer), Review desk (reviewer).
export function MobileDock({ role, active }: { role: Role; active?: 'Home' | 'Deals' | 'Audit' | 'Menu' }) {
  const pathname = usePathname();
  const isNew = role === 'seller' && pathname === '/deals/new';
  return <nav aria-label="Main navigation" className="mobile-dock seller-dock"><div className="grid grid-cols-5 items-center">
    {([{key:'Home',href:'/',label:'Home'},{key:'Deals',href:'/deals',label:'Transactions',short:'Deals'},{key:'New',href:role === 'reviewer' ? '/reviewer/oversight' : '/deals/new',label:role === 'reviewer' ? 'Review desk' : 'New deal',short:role === 'reviewer' ? 'Desk' : 'New deal'},{key:'How',href:'/how-it-works',label:'How it works',short:'How'},{key:'Menu',href:'/menu',label:'Settings'}] as const).map(item => item.key === 'New' && role === 'buyer' ? <JoinDeal key="Join" label="Join" className="seller-create [&>span:last-child]:text-[11px] [&>span:last-child]:leading-none flex min-w-0 flex-col items-center justify-center gap-0.5 text-center text-[11px] leading-none" icon={<span className="grid place-items-center"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/></svg></span>}/> : <Link key={item.key} href={item.href} aria-label={item.label} aria-current={(item.key === 'New' ? (role === 'reviewer' ? pathname === '/reviewer/oversight' : isNew) : item.key === 'How' ? pathname === '/how-it-works' : active === item.key && !isNew && pathname !== '/how-it-works') ? 'page' : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-0.5 text-center text-xs ${item.key === 'New' && role !== 'reviewer' ? 'seller-create' : ''}`}>
      <span className="grid place-items-center">{item.key === 'New' && role === 'reviewer' ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg> : item.key === 'New' ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-7"><path d="M12 4v16M4 12h16"/></svg> : item.key === 'How' ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="m9 12 2 2 4-4"/></svg> : <NavIcon name={item.key}/>}</span><span className="text-[11px] leading-none">{'short' in item ? item.short : item.label}</span>
    </Link>)}
  </div></nav>;
}
