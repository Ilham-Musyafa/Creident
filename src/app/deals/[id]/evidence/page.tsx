import Link from 'next/link';
import { displayItemName } from '../../../../components/displayItemName';
import { TechnicalDetails } from '../../../../components/TechnicalDetails';
import { evidenceLabel } from '../../../../components/presentationCopy';
import { notFound } from 'next/navigation';
import { StatusPill } from '../../../../components/ui';
import { AppShell, Card, EmptyState, Notice, PageHeader } from '../../../../components/layout';
import { EvidenceCompleteness } from '../../../../components/EvidenceCompleteness';
import { EvidenceCode } from '../../../../components/EvidenceCode';
import { DueSoon } from '../../../../components/DueSoon';
import { EvidenceForm } from '../../../../components/client';
import { deadlineUrgency, evidenceCode, shortDate, timeLeft } from '../../../../components/view';
import { data, getRole, isUuid, sha256 } from '../../../_server';
import { disputeType } from '../../../../lib/disputeTypes';

export const dynamic = 'force-dynamic';

function StepHeading({ number, title, optional = false }: { number: number; title: string; optional?: boolean }) {
  return <h2 className="mb-4 flex flex-wrap items-center gap-3 text-lg font-bold text-heading"><span aria-label={`Step ${number}`} className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-base">{number}</span>{title}{optional && <span className="rounded-full border border-line px-2 py-1 text-xs font-medium text-muted">Optional</span>}</h2>;
}

export default async function EvidencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const ctx = data();
  const tx = ctx.repo.loadTransaction(id);
  if (!tx) notFound();
  const role = await getRole();
  const evidence = ctx.repo.loadEvidence(id);
  const now = ctx.now();
  const left = timeLeft(tx.evidenceUntil, now);
  const open = tx.status === 'DISPUTED' && !!left;
  const urgency = open && role !== 'reviewer' ? deadlineUrgency(tx.evidenceUntil, now) : null;
  const opened = ctx.repo.readEvents(id).find(e => e.type === 'OPEN_DISPUTE');
  const type = disputeType(opened?.payload.disputeType);
  const tips = type ? (role === 'seller' ? type.seller : role === 'buyer' ? type.buyer : [...type.buyer, ...type.seller]) : [];

  return <AppShell active="Deals">
    <div className="evidence-page">
      <PageHeader title="Add evidence" back={`/deals/${id}`} subtitle={displayItemName(tx.item)} right={<div className="flex flex-wrap items-center gap-2">{/^\[Demo\]/i.test(tx.item) && <span className="inline-flex rounded-full border border-line bg-surface-2 px-2 py-1 text-xs font-semibold text-heading">Demo</span>}<StatusPill status={tx.status} suffix={open ? left! : undefined}/><DueSoon urgency={urgency} label={left}/></div>}/>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <StepHeading number={1} title="What to include"/>
            {type && <><p className="text-sm text-muted">Dispute type</p><p className="mt-1 text-sm font-bold text-heading">{type.label}</p>
              <p className="mt-4 text-sm text-muted">{role === 'reviewer' ? 'Evidence that usually settles this kind of case' : 'Evidence that usually helps in this kind of case'}</p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">{tips.map(t => <li key={t}>{t}</li>)}</ul></>}
            <EvidenceCode code={evidenceCode(id)}/>
            <p className="mt-3 text-sm text-muted">Include the deal's evidence code in your photo description. Write this code on paper and keep it visible in every photo.</p>
            <p className="mt-3 text-sm text-muted">This demo accepts text descriptions. Photo upload is not available yet.</p>
          </Card>
          <Card>
            <StepHeading number={2} title="Write your evidence"/>
            {role === 'reviewer' ? <Notice>Reviewers do not add evidence. Switch to Buyer or Seller in Settings.</Notice>
              : open ? <EvidenceForm txId={id} role={role}/>
              : <Notice>The evidence window is closed for this deal.</Notice>}
          </Card>
          {open && role !== 'reviewer' && <section aria-label="Optional evidence check">
            <StepHeading number={3} title="Check with AI" optional/>
            <EvidenceCompleteness key={`${role}:${evidence.filter(e => e.submittedBy === role).length}`} txId={id} side={role}/>
          </section>}
        </div>
        <aside className="min-w-0 space-y-6" aria-label="Your evidence so far">
          <Card>
            <h2 className="mb-4 text-lg font-bold text-heading">Your evidence so far</h2>
            <div className="mb-5 rounded-2xl border border-line bg-surface-2 p-4">
              <h3 className="text-sm font-semibold text-heading">Evidence deadline</h3>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-heading"><DueSoon urgency={urgency} label={left}/>{open ? left : 'The evidence window is closed for this deal.'}</p>
              {tx.evidenceUntil && <p className="mt-1 text-sm text-muted">{shortDate(tx.evidenceUntil)}</p>}
            </div>
            <p className="mb-3 text-sm text-muted">{evidence.length} items</p>
            {evidence.length === 0 ? <EmptyState title="Nothing submitted yet"/> : <ul className="space-y-3">
              {evidence.map((e, i) => <li key={e.id} className="min-w-0 rounded-2xl border border-line p-4">
                <p className="text-sm font-semibold capitalize text-heading">{evidenceLabel(e.submittedBy, evidence.slice(0, i + 1).filter(item => item.submittedBy === e.submittedBy).length)} · {e.kind} · {e.submittedBy}</p>
                <p className="mt-2 text-sm text-text [overflow-wrap:anywhere]">{e.content}</p>
                <TechnicalDetails><p>SHA-256: <span className="break-all font-mono">{sha256(e.content)}</span></p><p>Evidence ID: <span className="break-all font-mono">{e.id}</span></p></TechnicalDetails>
              </li>)}
            </ul>}
            <Link href={`/deals/${id}`} className="mt-5 inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-semibold text-heading hover:bg-surface-2">Back to deal</Link>
          </Card>
        </aside>
      </div>
    </div>
  </AppShell>;
}
