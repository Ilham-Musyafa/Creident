import { notFound } from 'next/navigation';
import { CodeBadge, StatusPill } from '../../../../components/ui';
import { AppShell, Card, EmptyState, Notice, PageHeader, SectionTitle } from '../../../../components/layout';
import { EvidenceForm } from '../../../../components/client';
import { evidenceCode, shortHash, timeLeft } from '../../../../components/view';
import { data, getRole, isUuid, sha256 } from '../../../_server';

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

  return (
    <AppShell active="Deals">
      <PageHeader title="Add evidence" back={`/deals/${id}`} subtitle={tx.item} right={<StatusPill status={tx.status} suffix={open ? left! : undefined}/>}/>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <Card>
            <p className="text-xs text-muted">Write this code on paper and keep it visible in every photo</p>
            <div className="mt-2"><CodeBadge code={evidenceCode(id)}/></div>
            <p className="mt-3 text-xs text-muted">In the real flow photos are taken in the app (no gallery uploads). In this demo, describe what the photo shows.</p>
          </Card>
          {role === 'reviewer' ? <Notice>Reviewers do not add evidence. Switch to Buyer or Seller in Menu.</Notice>
            : open ? <Card><EvidenceForm txId={id} role={role}/></Card>
            : <Notice>The evidence window is closed for this deal.</Notice>}
        </div>
        <div>
          <SectionTitle right={<span className="text-xs text-muted">{evidence.length} items</span>}>Submitted</SectionTitle>
          {evidence.length === 0 ? <EmptyState title="No evidence yet"/> : (
            <ul className="space-y-2">
              {evidence.map((e, i) => (
                <li key={e.id} className="rounded-[18px] border border-line bg-surface p-3">
                  <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold capitalize text-heading">E{i + 1} · {e.kind} · {e.submittedBy}</p><span className="font-mono text-[11px] text-muted">sha256 {shortHash(sha256(e.content))}</span></div>
                  <p className="mt-1 text-sm text-text">{e.content}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">Only in-platform chat counts as chat evidence. Evidence text is treated as data, never as instructions to the AI.</p>
        </div>
      </div>
    </AppShell>
  );
}
