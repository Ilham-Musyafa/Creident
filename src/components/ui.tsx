import type { ComponentPropsWithRef, CSSProperties, InputHTMLAttributes, ReactNode } from 'react';
import { CountUp } from './motion';
import Link from 'next/link';
import type { TxStatus } from '../lib/domain/types';

type Tone = 'awaiting' | 'authorized' | 'inspection' | 'disputed' | 'completed' | 'frozen' | 'void';
const statusMap: Record<TxStatus, { label: string; tone: Tone }> = {
  PARTIALLY_REFUNDED: { label: 'Partial refund issued', tone: 'void' },
  DRAFT: { label: 'Waiting for agreement', tone: 'void' }, TERMS_LOCKED: { label: 'Agreed · ready to pay', tone: 'completed' },
  AWAITING_APPROVAL: { label: 'Waiting for payment', tone: 'awaiting' },
  AUTHORIZED: { label: 'Payment approved · not charged yet', tone: 'authorized' },
  SHIPPED: { label: 'Shipped', tone: 'inspection' }, IN_INSPECTION: { label: 'Delivered · checking', tone: 'inspection' },
  DISPUTED: { label: 'Problem reported', tone: 'disputed' }, UNDER_REVIEW: { label: 'Being reviewed', tone: 'disputed' },
  RETURN_REQUESTED: { label: 'Return in progress', tone: 'awaiting' },
  FROZEN_EXTERNAL: { label: 'On hold · PayPal dispute', tone: 'frozen' }, COMPLETED: { label: 'Completed', tone: 'completed' },
  REFUNDED: { label: 'Refund issued', tone: 'void' }, VOIDED: { label: 'Cancelled · not charged', tone: 'void' },
  CANCELLED: { label: 'Cancelled', tone: 'void' },
};
const mobileTone: Record<Tone, string> = { completed: 'success', awaiting: 'warning', disputed: 'danger', authorized: 'info', inspection: 'info', frozen: 'warning', void: 'neutral' };
const toneStyle = (tone: Tone) => ({ backgroundColor: `var(--${tone}-bg)`, color: `var(--${tone}-text)` });

export function Button({ variant = 'accent', fullWidth = false, className = '', ...props }: ComponentPropsWithRef<'button'> & { variant?: 'accent' | 'ghost' | 'strong'; fullWidth?: boolean }) {
  const colors = { accent: 'bg-accent text-on-accent', ghost: 'border border-line bg-surface text-heading', strong: 'bg-strong text-on-strong' };
  return <button className={`min-h-[46px] rounded-full px-5 text-sm font-bold hv-press hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 ${colors[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} {...props} />;
}
export function StatusPill({ status, suffix, compact = false, className = '' }: { status: TxStatus; suffix?: string; compact?: boolean; className?: string }) {
  const { label, tone } = statusMap[status];
  const shownLabel = compact && status === 'AUTHORIZED' ? 'Approved · not charged' : label;
  return <span title={compact ? label : undefined} data-mobile-tone={mobileTone[tone]} className={`mobile-status inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${className}`} style={toneStyle(tone)}><span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full bg-current ${tone === 'disputed' || tone === 'awaiting' ? 'hv-dot' : ''}`}/><span className="min-w-0 break-words">{shownLabel}{suffix ? ` · ${suffix}` : ''}</span></span>;
}
export function AmountCard({ amount, label = 'Payment approved · not charged yet', stats, onAction, actionHref, actionLabel = '+ New deal' }: { amount: string; label?: string; stats: { label: string; value: string }[]; onAction?: () => void; actionHref?: string; actionLabel?: string }) {
  return (
    <section className="rounded-[26px] bg-hero p-5 text-hero-text" aria-label="Amount overview">
      <p className="text-sm text-hero-sub">{label}</p>
      <p className="mt-1 text-[32px] font-extrabold tracking-tight tabular-nums"><CountUp value={amount}/></p>
      <div className="my-5 grid grid-cols-3 gap-2">
        {stats.map(s => <div key={s.label} className="rounded-[14px] bg-white/10 p-3"><strong className="block tabular-nums">{s.value}</strong><span className="text-sm text-hero-sub">{s.label}</span></div>)}
      </div>
      {actionHref ? <ButtonLink href={actionHref}>{actionLabel}</ButtonLink> : onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
    </section>
  );
}

const buttonColors = { accent: 'bg-accent text-on-accent', ghost: 'border border-line bg-surface text-heading', strong: 'bg-strong text-on-strong' };

/** A link styled like Button, for navigation actions. */
export function ButtonLink({ href, variant = 'accent', fullWidth = false, className = '', children }: { href: string; variant?: 'accent' | 'ghost' | 'strong'; fullWidth?: boolean; className?: string; children: ReactNode }) {
  return <Link href={href} className={`inline-flex min-h-[46px] items-center justify-center rounded-full px-5 text-sm font-bold hv-press hover:opacity-80 ${buttonColors[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}>{children}</Link>;
}
export function DealListItem({ title, amount, status, href, icon = '◇' }: { title: string; amount: string; status: TxStatus; href: string; icon?: ReactNode }) {
  const tone = statusMap[status].tone;
  return <Link href={href} className="flex min-h-[72px] min-w-0 items-center gap-3 rounded-[18px] border border-line bg-surface p-3 hover:bg-surface-2"><span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[14px] text-xl" style={toneStyle(tone)}>{icon}</span><span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold text-heading">{title}</span><StatusPill status={status}/></span><strong className="shrink-0 text-sm tabular-nums">{amount}</strong></Link>;
}
export function Timeline({ steps }: { steps: { title: string; detail?: string; state: 'done' | 'current' | 'upcoming' }[] }) {
  return <ol className="space-y-0">{steps.map((s, i) => <li key={`${s.title}-${i}`} className="flex gap-3"><div className="flex flex-col items-center"><span style={{ '--i': i } as CSSProperties} className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${s.state === 'done' ? 'hv-step-done ' : s.state === 'current' ? 'hv-step-current ' : ''}${s.state === 'done' ? 'border-heading bg-heading text-on-strong' : s.state === 'current' ? 'border-[var(--inspection-text)] bg-[var(--inspection-bg)] text-[var(--inspection-text)]' : 'border-line text-muted'}`}>{s.state === 'done' ? '✓' : i + 1}</span>{i < steps.length - 1 && <span className="h-8 w-px bg-line"/>}</div><div className="pb-4"><p className="text-sm font-semibold text-heading">{s.title}</p>{s.detail && <p className="text-sm text-muted">{s.detail}</p>}</div></li>)}</ol>;
}
export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return <dl className="rounded-[22px] border border-line bg-surface p-4">{items.map(item => <div key={item.label} className="flex justify-between gap-4 border-b border-dashed border-line py-2 last:border-0"><dt className="text-sm text-muted">{item.label}</dt><dd className="text-right text-sm font-semibold tabular-nums">{item.value}</dd></div>)}</dl>;
}
export function FindingCard({ criterion, supports, evidenceIds }: { criterion: string; supports: 'buyer' | 'seller' | 'unclear'; evidenceIds: string[] }) {
  // Matches docs/UI.md mockups: buyer = disputed tone, seller = completed tone, unclear = neutral.
  const tone: Tone = supports === 'unclear' ? 'void' : supports === 'buyer' ? 'disputed' : 'completed';
  return <article className="rounded-[18px] border border-line bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-bold text-heading">{criterion}</h3><span className="rounded-full px-2 py-1 text-xs font-bold" style={toneStyle(tone)}>{supports === 'unclear' ? 'Unclear' : `Supports ${supports}`}</span></div><div className="mt-3 flex flex-wrap gap-1">{evidenceIds.map(id => <span key={id} className="rounded-md bg-surface-2 px-2 py-1 font-mono text-xs text-muted">{id}</span>)}</div></article>;
}
export function RuleNotice({ rule, reason }: { rule: `R${1|2|3|4|5|6|7}`; reason: string }) {
  return <aside className="rounded-[18px] border p-4 text-sm" style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning-line)', color: 'var(--warning-text)' }}><strong>{rule} · {reason}</strong><p className="mt-1">The AI only summarises; it cannot release or refund.</p></aside>;
}
/** ok: verified. failed: the first step that does not match. after: later steps, which cannot be verified once the chain is broken. */
export type StepCheck = 'ok' | 'failed' | 'after';
export function AuditEvent({ seq, title, actor, time, prevHash, rawType, simulated = false, index, fullPrevHash, hash, check = 'ok' }: { seq: number; title: string; actor: string; time: string; prevHash: string; rawType?: string; simulated?: boolean; index?: number; fullPrevHash?: string; hash?: string; check?: StepCheck }) {
  // A row shows only what happened and when. A normal step gets no badge (the summary above
  // already says how many steps are verified); only a step that failed verification is flagged.
  // Step number, actor, source and fingerprints open on tap.
  const row = <span className="flex items-center gap-3"><span className="min-w-0 flex-1"><span title={rawType} className="block text-sm font-semibold text-heading [overflow-wrap:anywhere]">{title}</span><span className="block text-sm text-muted">{time}</span>
    {check === 'failed' && <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-sm font-bold" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>⚠ Verification failed here</span>}
    {check === 'after' && <span className="mt-0.5 block text-sm text-muted">Cannot verify after the failed step</span>}</span>
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>;
  const details = <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-[12px] bg-surface-2 p-3 text-sm">
    <dt className="text-muted">Step</dt><dd className="font-mono text-heading">#{seq}</dd>
    <dt className="text-muted">By</dt><dd className="capitalize text-heading">{actor}</dd>
    {simulated && <><dt className="text-muted">Source</dt><dd className="text-heading">Demo (not from PayPal)</dd></>}
    {hash && <><dt className="text-muted">Fingerprint</dt><dd className="break-all font-mono text-xs text-muted">{hash}</dd></>}
    <dt className="text-muted">Previous step</dt><dd className="break-all font-mono text-xs text-muted">{fullPrevHash ?? prevHash}</dd>
    {rawType && <><dt className="text-muted">Technical name</dt><dd className="break-all font-mono text-xs text-muted">{rawType}</dd></>}
  </dl>;
  return <li id={`step-${seq}`} style={index === undefined ? undefined : { '--i': index } as CSSProperties} className={`scroll-mt-24 border-b border-line py-3 last:border-0 ${index === undefined ? '' : 'hv-chain-item'} ${check === 'after' ? 'opacity-60' : ''}`}>
    <details className="group"><summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">{row}</summary>{details}</details>
  </li>;
}
/** "15 of 15 steps verified". `where` says what the check covers (this server, or also a sealed copy). */
export function ChainStatus({ verifiedSteps, count, where, revealAfterMs }: { verifiedSteps: number; count: number; where: string; revealAfterMs?: number }) {
  const verified = verifiedSteps === count;
  return <div role="status" className={`rounded-[18px] border p-4 text-sm ${revealAfterMs === undefined ? '' : 'hv-verified'}`} style={{ ...(revealAfterMs === undefined ? {} : { '--after': `${revealAfterMs}ms` }), background: verified ? 'var(--success-bg)' : 'var(--warning-bg)', borderColor: verified ? 'var(--success-line)' : 'var(--warning-line)', color: verified ? 'var(--success-text)' : 'var(--warning-text)' }}>
    <strong className="block">{verified ? '✓ ' : '⚠ '}{verifiedSteps} of {count} steps verified</strong>
    <span className="mt-0.5 block text-sm">{verified ? where : `Step #${verifiedSteps + 1} does not match the steps before it.`}</span>
    {!verified && <a href={`#step-${verifiedSteps + 1}`} className="mt-1 inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">Go to step #{verifiedSteps + 1}</a>}
  </div>;
}
export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`min-h-11 w-full rounded-[14px] border border-line bg-surface px-4 text-sm text-text placeholder:text-muted ${className}`} {...props}/>;
}
export function Field({ label, id, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; hint?: string }) {
  return <label htmlFor={id} className="block text-sm font-medium text-muted"><span className="mb-2 block">{label}</span><Input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...props}/>{hint && <span id={`${id}-hint`} className="mt-1 block text-sm">{hint}</span>}</label>;
}
export function CodeBadge({ code }: { code: string }) { return <strong className="inline-block rounded-xl bg-surface-2 px-3 py-2 font-mono text-sm tracking-widest text-heading">{code}</strong>; }

type NavItem = { label: 'Home' | 'Deals' | 'Audit' | 'Menu'; href: string };
const navItems: NavItem[] = [{ label: 'Home', href: '/' }, { label: 'Deals', href: '/deals' }, { label: 'Audit', href: '/audit' }, { label: 'Menu', href: '/menu' }];
function NavIcon({ name }: { name: NavItem['label'] }) {
  const path = { Home: <><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></>, Deals: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>, Audit: <><path d="M6 3h9l4 4v14H5V3zM14 3v5h5M8 12h8M8 16h6"/></>, Menu: <><path d="M19.31 9.91L21.88 10.44L21.88 13.56L19.31 14.09L18.65 15.68L20.09 17.88L17.88 20.09L15.68 18.65L14.09 19.31L13.56 21.88L10.44 21.88L9.91 19.31L8.32 18.65L6.12 20.09L3.91 17.88L5.35 15.68L4.69 14.09L2.12 13.56L2.12 10.44L4.69 9.91L5.35 8.32L3.91 6.12L6.12 3.91L8.32 5.35L9.91 4.69L10.44 2.12L13.56 2.12L14.09 4.69L15.68 5.35L17.88 3.91L20.09 6.12L18.65 8.32Z"/><circle cx="12" cy="12" r="3"/></> }[name];
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">{path}</svg>;
}
export function BottomNav({ active = 'Home' }: { active?: NavItem['label'] }) {
  return <nav aria-label="Main navigation" className="mobile-dock rounded-t-[24px] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:rounded-none lg:pb-0 lg:w-64 lg:shrink-0 lg:border-r lg:border-t-0"><div className="flex items-center justify-around lg:flex-col lg:items-stretch lg:gap-2 lg:p-4">{navItems.map(item => <Link key={item.label} href={item.href} aria-current={active === item.label ? 'page' : undefined} className={`flex min-h-[72px] min-w-12 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold lg:min-h-11 lg:flex-none lg:flex-row lg:justify-start lg:rounded-xl lg:px-3 lg:text-sm hover:bg-surface-2 ${active === item.label ? 'text-heading lg:bg-surface-2' : 'text-muted'}`}><span className={`grid h-8 w-11 place-items-center rounded-full lg:size-5 lg:rounded-none ${active === item.label ? 'bg-surface-2 lg:bg-transparent' : ''}`}><NavIcon name={item.label}/></span><span>{item.label === 'Audit' ? 'Records' : item.label === 'Deals' ? 'Transactions' : item.label === 'Menu' ? 'Settings' : item.label}</span></Link>)}</div></nav>;
}
