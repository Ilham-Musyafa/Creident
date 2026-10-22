'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import type { OversightSnapshot } from '../../lib/oversight';
import { Button } from '../ui';
import { Notice } from '../layout';
import { shortDate } from '../view';

const StudioDashboard = dynamic(() => import('./StudioDashboard'), { ssr: false,
  loading: () => <p role="status" className="p-4 text-sm text-muted">Loading AG Studio…</p> });

export function OversightClient({ licenseKey }: { licenseKey?: string }) {
  const [snapshot, setSnapshot] = useState<OversightSnapshot | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/reviewer/oversight', { headers: { 'x-demo-role': 'reviewer' }, cache: 'no-store', signal });
      if (!response.ok) throw new Error(response.status === 403 ? 'Reviewer access is required. Check your role and code in Menu.' : 'Dashboard unavailable. Try again.');
      const value: OversightSnapshot = await response.json(); if (!signal?.aborted) setSnapshot(value);
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Dashboard unavailable. Try again.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const abort = new AbortController(); void load(abort.signal); return () => abort.abort(); }, [load]);
  return <div className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted">{snapshot ? `Snapshot ${shortDate(snapshot.asOf)} · ${snapshot.totalDeals} deals · ${snapshot.demoDeals} labelled demo deals` : 'Read-only local data'}</p>
      <Button variant="ghost" disabled={loading} onClick={() => void load()}>{loading ? 'Refreshing…' : 'Refresh snapshot'}</Button>
    </div>
    {!licenseKey && <Notice>AG Studio evaluation mode (no licence key yet).</Notice>}
    {error && <Notice tone="warning">{error}</Notice>}
    {loading && !snapshot && <p role="status" className="p-4 text-sm text-muted">Loading oversight data…</p>}
    {snapshot && !error && (snapshot.totalDeals === 0 ? <Notice>No deals yet. Load labelled demo deals in Menu to explore the dashboard.</Notice>
      : <StudioDashboard snapshot={snapshot} licenseKey={licenseKey}/>)}
    <div className="space-y-2 text-xs text-muted">
      <p>Dispute charts include deals with a recorded local dispute or external case/freeze, including finished disputes. Escalation is ESCALATE_HUMAN recommendations / all stored recommendations; it is not an accuracy measure. No recommendations means no rate.</p>
      <p>AI counts use recorded audit events only. Created includes validated checks/translations. Terms previews and unsuccessful outbound-draft attempts are not all logged, so totals are incomplete; ignored drafts cannot be inferred. A draft used more than once on one deal counts once. Zero means no recorded event, not proof of no activity.</p>
      <p>Deadlines are a snapshot; frozen queues are labelled and cannot move payments here. Refresh to update time left. Demo and simulated data are illustrative. This dashboard has no payment, sync, tick or decision controls.</p>
    </div>
  </div>;
}
