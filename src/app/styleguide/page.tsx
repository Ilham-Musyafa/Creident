import type { TxStatus } from '../../lib/domain/types';
import { AmountCard, AuditEvent, BottomNav, Button, ChainStatus, CodeBadge, DealListItem, Field, FindingCard, KeyValue, RuleNotice, StatusPill, Timeline } from '../../components/ui';
import { ThemeSelector } from '../../components/ThemeSelector';

const statuses: TxStatus[] = ['DRAFT', 'TERMS_LOCKED', 'AWAITING_APPROVAL', 'AUTHORIZED', 'SHIPPED', 'IN_INSPECTION', 'DISPUTED', 'UNDER_REVIEW', 'FROZEN_EXTERNAL', 'COMPLETED', 'REFUNDED', 'VOIDED', 'CANCELLED'];
function Preview({ theme }: { theme: 'light' | 'dark' }) {
  return <section data-theme={theme} className="min-w-0 rounded-[26px] bg-bg p-5 text-text ring-1 ring-line sm:p-7" aria-label={`${theme} component preview`}>
    <h2 className="mb-5 text-base font-bold text-heading">{theme === 'light' ? 'Light' : 'Dark'} preview</h2>
    <div className="space-y-6">
      <AmountCard amount="$245.00" stats={[{label:'Active',value:'3'},{label:'In dispute',value:'1'},{label:'Completed',value:'12'}]}/>
      <div><h3 className="mb-2 text-[15px] font-bold text-heading">Buttons</h3><div className="flex flex-wrap gap-2"><Button>Primary action</Button><Button variant="ghost">Secondary</Button><Button variant="strong">Refund</Button></div><div className="mt-2 max-w-xs"><Button fullWidth>Full-width action</Button></div></div>
      <div><h3 className="mb-2 text-[15px] font-bold text-heading">Transaction status</h3><div className="flex flex-wrap gap-2">{statuses.map(s => <StatusPill key={s} status={s} suffix={s === 'IN_INSPECTION' ? '1d 4h left' : undefined}/>)}</div></div>
      <div><h3 className="mb-2 text-[15px] font-bold text-heading">Deals</h3><div className="space-y-2"><DealListItem href="/styleguide" title="Used phone, 128 GB" amount="$120.00" status="IN_INSPECTION"/><DealListItem href="/styleguide" title="Film camera" amount="$85.00" status="DISPUTED"/></div></div>
      <div><h3 className="mb-2 text-[15px] font-bold text-heading">Progress</h3><div className="rounded-[22px] border border-line bg-surface p-4"><Timeline steps={[{title:'Terms locked',detail:'Both parties agreed',state:'done'},{title:'Payment approved',detail:'Not charged yet',state:'done'},{title:'Buyer inspection',detail:'Confirm or open a dispute',state:'current'},{title:'Payment charged',state:'upcoming'}]}/></div></div>
      <div><h3 className="mb-2 text-[15px] font-bold text-heading">Fee details</h3><KeyValue items={[{label:'PayPal fee (estimate)',value:'$0.64'},{label:'Refund fee',value:'fee covered by the platform (buyer refunded in full)'}]}/></div>
      <div><h3 className="mb-2 text-[15px] font-bold text-heading">AI evidence summary</h3><div className="space-y-2"><FindingCard criterion="Condition matches listing" supports="buyer" evidenceIds={['E1','E3']}/><FindingCard criterion="Delivered to agreed address" supports="seller" evidenceIds={['E2']}/><FindingCard criterion="Damage in transit" supports="unclear" evidenceIds={[]}/></div></div>
      <RuleNotice rule="R5" reason="Escalated to a human. Findings point to different sides."/>
      <div><h3 className="mb-2 text-[15px] font-bold text-heading">Records</h3><ChainStatus verifiedSteps={9} count={9} where="Verified on this server"/><div className="mt-2 rounded-[22px] border border-line bg-surface px-4"><ol><AuditEvent seq={9} title="A reviewer needs to decide" actor="system" time="Oct 21 09:15" prevHash="a71c…"/><AuditEvent seq={8} title="Evidence added" actor="seller" time="Oct 21 08:40" prevHash="09be…"/></ol></div><div className="mt-2"><ChainStatus verifiedSteps={7} count={9} where="Verified on this server"/></div></div>
      <div><h3 className="mb-2 text-[15px] font-bold text-heading">Form & code</h3><Field id={`${theme}-item`} label="Item" placeholder="Used phone, 128 GB" hint="Describe the agreed item."/><div className="mt-3"><CodeBadge code="CR-1042 · 7K2Q"/></div></div>
      <div><h3 className="mb-2 text-[15px] font-bold text-heading">Navigation</h3><p className="mb-2 text-sm text-muted">Bottom navigation on mobile; sidebar from 1024px.</p><BottomNav active="Deals"/></div>
    </div>
  </section>;
}
export default function Styleguide() {
  return <main className="mx-auto max-w-[1100px] px-5 py-8"><header className="mb-7"><p className="text-sm font-bold uppercase tracking-widest text-muted">Sandbox demo · UI foundation</p><h1 className="mt-2 text-2xl font-extrabold text-heading">Creident styleguide</h1><p className="mt-2 max-w-2xl text-sm text-muted">Components and sample data for this dispute-mediation prototype. AI only summarises evidence; a human decides.</p><div className="mt-4"><p className="mb-2 text-sm font-semibold text-muted">Appearance</p><ThemeSelector/></div></header><div className="grid gap-6 lg:grid-cols-2"><Preview theme="light"/><Preview theme="dark"/></div></main>;
}
