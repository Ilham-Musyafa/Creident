import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import type { TxStatus } from '../lib/domain/types';

type Tone = 'awaiting' | 'authorized' | 'inspection' | 'disputed' | 'completed' | 'frozen' | 'void';
const statusMap: Record<TxStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Draft', tone: 'void' }, TERMS_LOCKED: { label: 'Terms locked', tone: 'completed' },
  AWAITING_APPROVAL: { label: 'Awaiting approval', tone: 'awaiting' },
  AUTHORIZED: { label: 'Authorized (funds reserved)', tone: 'authorized' },
  SHIPPED: { label: 'Shipped', tone: 'inspection' }, IN_INSPECTION: { label: 'Inspection', tone: 'inspection' },
  DISPUTED: { label: 'Disputed', tone: 'disputed' }, UNDER_REVIEW: { label: 'Under review', tone: 'disputed' },
  FROZEN_EXTERNAL: { label: 'Frozen by PayPal', tone: 'frozen' }, COMPLETED: { label: 'Completed', tone: 'completed' },
  REFUNDED: { label: 'Refunded', tone: 'void' }, VOIDED: { label: 'Voided', tone: 'void' },
  CANCELLED: { label: 'Cancelled', tone: 'void' },
};
const toneStyle = (tone: Tone) => ({ backgroundColor: `var(--${tone}-bg)`, color: `var(--${tone}-text)` });

export function Button({ variant = 'accent', fullWidth = false, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'accent' | 'ghost' | 'strong'; fullWidth?: boolean }) {
  const colors = { accent: 'bg-accent text-on-accent', ghost: 'border border-line bg-surface text-heading', strong: 'bg-strong text-on-strong' };
  return <button className={`min-h-[46px] rounded-full px-5 text-sm font-bold transition-opacity duration-150 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 ${colors[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} {...props} />;
}
export function StatusPill({ status, suffix }: { status: TxStatus; suffix?: string }) {
  const { label, tone } = statusMap[status];
  return <span className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={toneStyle(tone)}><span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current"/><span>{label}{suffix ? ` · ${suffix}` : ''}</span></span>;
}
export function AmountCard({ amount, label = 'Authorized via PayPal, not yet captured', stats, onAction, actionHref, actionLabel = '+ New deal' }: { amount: string; label?: string; stats: { label: string; value: string }[]; onAction?: () => void; actionHref?: string; actionLabel?: string }) {
  return (
    <section className="rounded-[26px] bg-hero p-5 text-hero-text" aria-label="Amount overview">
      <p className="text-xs text-hero-sub">{label}</p>
      <p className="mt-1 text-[32px] font-extrabold tracking-tight tabular-nums">{amount}</p>
      <div className="my-5 grid grid-cols-3 gap-2">
        {stats.map(s => <div key={s.label} className="rounded-[14px] bg-white/10 p-3"><strong className="block tabular-nums">{s.value}</strong><span className="text-xs text-hero-sub">{s.label}</span></div>)}
      </div>
      {actionHref ? <ButtonLink href={actionHref}>{actionLabel}</ButtonLink> : onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
    </section>
  );
}

const buttonColors = { accent: 'bg-accent text-on-accent', ghost: 'border border-line bg-surface text-heading', strong: 'bg-strong text-on-strong' };

/** A link styled like Button, for navigation actions. */
export function ButtonLink({ href, variant = 'accent', fullWidth = false, className = '', children }: { href: string; variant?: 'accent' | 'ghost' | 'strong'; fullWidth?: boolean; className?: string; children: ReactNode }) {
  return <Link href={href} className={`inline-flex min-h-[46px] items-center justify-center rounded-full px-5 text-sm font-bold transition-opacity duration-150 hover:opacity-80 ${buttonColors[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}>{children}</Link>;
}
export function DealListItem({ title, amount, status, href, icon = '◇' }: { title: string; amount: string; status: TxStatus; href: string; icon?: ReactNode }) {
  const tone = statusMap[status].tone;
  return <Link href={href} className="flex min-h-[72px] items-center gap-3 rounded-[18px] border border-line bg-surface p-3 hover:bg-surface-2"><span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[14px] text-xl" style={toneStyle(tone)}>{icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-heading">{title}</span><StatusPill status={status}/></span><strong className="shrink-0 text-sm tabular-nums">{amount}</strong></Link>;
}
export function Timeline({ steps }: { steps: { title: string; detail?: string; state: 'done' | 'current' | 'upcoming' }[] }) {
  return <ol className="space-y-0">{steps.map((s, i) => <li key={`${s.title}-${i}`} className="flex gap-3"><div className="flex flex-col items-center"><span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold ${s.state === 'done' ? 'border-heading bg-heading text-on-strong' : s.state === 'current' ? 'border-[var(--inspection-text)] bg-[var(--inspection-bg)] text-[var(--inspection-text)]' : 'border-line text-muted'}`}>{s.state === 'done' ? '✓' : i + 1}</span>{i < steps.length - 1 && <span className="h-8 w-px bg-line"/>}</div><div className="pb-4"><p className="text-sm font-semibold text-heading">{s.title}</p>{s.detail && <p className="text-xs text-muted">{s.detail}</p>}</div></li>)}</ol>;
}
export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return <dl className="rounded-[22px] border border-line bg-surface p-4">{items.map(item => <div key={item.label} className="flex justify-between gap-4 border-b border-dashed border-line py-2 last:border-0"><dt className="text-sm text-muted">{item.label}</dt><dd className="text-right text-sm font-semibold tabular-nums">{item.value}</dd></div>)}</dl>;
}
export function FindingCard({ criterion, supports, evidenceIds }: { criterion: string; supports: 'buyer' | 'seller' | 'unclear'; evidenceIds: string[] }) {
  // Matches docs/UI.md mockups: buyer = disputed tone, seller = completed tone, unclear = neutral.
  const tone: Tone = supports === 'unclear' ? 'void' : supports === 'buyer' ? 'disputed' : 'completed';
  return <article className="rounded-[18px] border border-line bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-bold text-heading">{criterion}</h3><span className="rounded-full px-2 py-1 text-[11px] font-bold" style={toneStyle(tone)}>{supports === 'unclear' ? 'Unclear' : `Supports ${supports}`}</span></div><div className="mt-3 flex flex-wrap gap-1">{evidenceIds.map(id => <span key={id} className="rounded-md bg-surface-2 px-2 py-1 font-mono text-[11px] text-muted">{id}</span>)}</div></article>;
}
export function RuleNotice({ rule, reason }: { rule: `R${1|2|3|4|5|6|7}`; reason: string }) {
  return <aside className="rounded-[18px] border p-4 text-sm" style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning-line)', color: 'var(--warning-text)' }}><strong>Rule {rule} · {reason}</strong><p className="mt-1">The AI only summarises; it cannot release or refund.</p></aside>;
}
export function AuditEvent({ seq, title, actor, time, prevHash, simulated = false }: { seq: number; title: string; actor: string; time: string; prevHash: string; simulated?: boolean }) {
  return <li className="flex gap-3 border-b border-line py-3 last:border-0"><span className="h-fit rounded-full bg-surface-2 px-2 py-1 font-mono text-xs text-muted">#{seq}</span><div><p className="text-sm font-semibold text-heading">{title}{simulated && <span className="ml-2 rounded-full px-2 py-0.5 align-middle text-[11px] font-bold" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>Simulated</span>}</p><p className="break-all font-mono text-xs text-muted">{actor} · {time} · prev {prevHash}</p></div></li>;
}
export function ChainStatus({ verified, count, headHash }: { verified: boolean; count: number; headHash: string }) {
  return <div role="status" className="rounded-[18px] border p-4 text-sm" style={{ background: verified ? 'var(--success-bg)' : 'var(--warning-bg)', borderColor: verified ? 'var(--success-line)' : 'var(--warning-line)', color: verified ? 'var(--success-text)' : 'var(--warning-text)' }}><strong>{verified ? `Chain verified · ${count} events` : 'Chain verification failed'}</strong><p className="mt-1 break-all font-mono text-xs">Head {headHash}</p></div>;
}
export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`min-h-11 w-full rounded-[14px] border border-line bg-surface px-4 text-sm text-text placeholder:text-muted ${className}`} {...props}/>;
}
export function Field({ label, id, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; hint?: string }) {
  return <label htmlFor={id} className="block text-xs font-medium text-muted"><span className="mb-2 block">{label}</span><Input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...props}/>{hint && <span id={`${id}-hint`} className="mt-1 block text-xs">{hint}</span>}</label>;
}
export function CodeBadge({ code }: { code: string }) { return <strong className="inline-block rounded-xl bg-surface-2 px-3 py-2 font-mono text-sm tracking-widest text-heading">{code}</strong>; }

type NavItem = { label: 'Home' | 'Deals' | 'New' | 'Audit' | 'Menu'; href: string };
const navItems: NavItem[] = [{ label: 'Home', href: '/' }, { label: 'Deals', href: '/deals' }, { label: 'New', href: '/deals/new' }, { label: 'Audit', href: '/audit' }, { label: 'Menu', href: '/menu' }];
function NavIcon({ name }: { name: NavItem['label'] }) {
  const path = { Home: <><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></>, Deals: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>, New: <path d="M12 5v14M5 12h14"/>, Audit: <path d="M12 2 4 5v6c0 5 3 9 8 11 5-2 8-6 8-11V5z"/>, Menu: <path d="M4 6h16M4 12h16M4 18h16"/> }[name];
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">{path}</svg>;
}
export function BottomNav({ active = 'Home' }: { active?: NavItem['label'] }) {
  return <nav aria-label="Main navigation" className="border-t border-line bg-surface lg:w-56 lg:shrink-0 lg:border-r lg:border-t-0"><div className="flex items-center justify-around lg:flex-col lg:items-stretch lg:gap-2 lg:p-4">{navItems.map(item => <Link key={item.label} href={item.href} aria-current={active === item.label ? 'page' : undefined} className={`flex min-h-14 min-w-12 flex-col items-center justify-center gap-1 text-[11px] font-semibold lg:min-h-11 lg:flex-row lg:justify-start lg:rounded-xl lg:px-3 lg:text-sm ${item.label === 'New' ? 'text-heading lg:bg-accent lg:text-on-accent' : active === item.label ? 'text-heading lg:bg-surface-2' : 'text-muted'} ${item.label === 'New' ? '[&>svg]:size-11 [&>svg]:rounded-full [&>svg]:bg-accent [&>svg]:p-3 [&>svg]:text-on-accent lg:[&>svg]:size-5 lg:[&>svg]:rounded-none lg:[&>svg]:bg-transparent lg:[&>svg]:p-0' : ''}`}><NavIcon name={item.label}/><span>{item.label}</span></Link>)}</div></nav>;
}
