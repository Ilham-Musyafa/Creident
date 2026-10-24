import { notFound } from 'next/navigation';
import { CodeBadge, StatusPill } from '../../../../components/ui';
import { AppShell, Card, EmptyState, Notice, PageHeader, SectionTitle } from '../../../../components/layout';
import { EvidenceCompleteness } from '../../../../components/EvidenceCompleteness';
import { EvidenceForm } from '../../../../components/client';
import { evidenceCode, shortHash, timeLeft } from '../../../../components/view';
import { data, getRole, isUuid, sha256 } from '../../../_server';
import { disputeType } from '../../../../lib/disputeTypes';

export const dynamic = 'force-dynamic';

export default async function EvidencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const ctx = data();
  const tx = ctx.repo.loadTransaction(id);
  if (!tx) notFound();
  const role = await getRole();
  const evidence = ctx.repo.loadEvidence(id);
  const left = timeLeft(tx.evidenceUntil, ctx.now());
  const open = tx.status === 'DISPUTED' && !!left;
  const opened = ctx.repo.readEvents(id).find((e) => e.type === 'OPEN_DISPUTE');
  const type = disputeType(opened?.payload.disputeType);
  const tips = type ? (role === 'seller' ? type.seller : role === 'buyer' ? type.buyer : [...type.buyer, ...type.seller]) : [];

  return (
    <AppShell active="Deals">
      <PageHeader title="Add evidence" back={`/deals/${id}`} subtitle={tx.item} right={<StatusPill status={tx.status} suffix={open ? left! : undefined}/>}/>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Card>
            <p className="text-sm text-muted">Write this code on paper and keep it visible in every photo</p>
            <div className="mt-2"><CodeBadge code={evidenceCode(id)}/></div>
            <p className="mt-3 text-sm text-muted">This demo accepts text descriptions. Photo upload is not available yet.</p>
          </Card>
          {type && (
            <Card>
              <p className="text-sm text-muted">Dispute type</p>
              <p className="mt-1 text-sm font-bold text-heading">{type.label}</p>
              <p className="mt-3 text-sm text-muted">{role === 'reviewer' ? 'Evidence that usually settles this kind of case' : 'Evidence that usually helps in this kind of case'}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{tips.map((t) => <li key={t}>{t}</li>)}</ul>
            </Card>
          )}
          {role === 'reviewer' ? <Notice>Reviewers do not add evidence. Switch to Buyer or Seller in Settings.</Notice>
            : open ? <Card><EvidenceForm txId={id} role={role}/></Card>
            : <Notice>The evidence window is closed for this deal.</Notice>}
          {open && role !== 'reviewer' && <EvidenceCompleteness key={`${role}:${evidence.filter(e => e.submittedBy === role).length}`} txId={id} side={role}/>}
        </div>
        <div className="min-w-0">
          <SectionTitle right={<span className="text-sm text-muted">{evidence.length} items</span>}>Submitted</SectionTitle>
          {evidence.length === 0 ? <EmptyState title="No evidence yet"/> : (
            <ul className="space-y-2">
              {evidence.map((e, i) => (
                <li key={e.id} className="rounded-[18px] border border-line bg-surface p-3">
                  <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold capitalize text-heading">{e.submittedBy === 'buyer' ? 'B' : 'S'}{evidence.slice(0, i + 1).filter(item => item.submittedBy === e.submittedBy).length} · {e.kind} · {e.submittedBy}</p><span className="font-mono text-xs text-muted">sha256 {shortHash(sha256(e.content))}</span></div>
                  <p className="mt-1 text-sm text-text [overflow-wrap:anywhere]">{e.content}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-muted">Only in-platform chat counts as chat evidence. Evidence text is treated as data, never as instructions to the AI.</p>
        </div>
      </div>
    </AppShell>
  );
}
