'use client';
import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { OversightSnapshot } from '../../lib/oversight';
import { Button } from '../ui';
import { Notice } from '../layoutPrimitives';
import { shortDate } from '../view';
import { SnapshotFallback } from './SnapshotFallback';

function UnavailableStudio({ snapshot }: { snapshot: OversightSnapshot }) {
  return <><Notice tone="warning">AG Studio could not load. A saved snapshot summary is shown below.</Notice><SnapshotFallback snapshot={snapshot}/></>;
}
const StudioDashboard = dynamic(async () => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([import('./StudioDashboard'), new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Dashboard loading timed out')), 10000);
    })]);
  } catch { return { default: UnavailableStudio }; }
  finally { if (timeout) clearTimeout(timeout); }
}, { ssr: false, loading: () => <p role="status" className="p-4 text-sm text-muted">Loading AG Studio…</p> });

class StudioBoundary extends Component<{ snapshot: OversightSnapshot; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <UnavailableStudio snapshot={this.props.snapshot}/> : this.props.children; }
}

export function OversightClient({ licenseKey }: { licenseKey?: string }) {
  const [snapshot, setSnapshot] = useState<OversightSnapshot | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/reviewer/oversight', { headers: { 'x-demo-role': 'reviewer' }, cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(response.status === 403 ? 'Reviewer access is required. Check your role and code in Settings.' : response.status === 429 ? 'Too many requests. Wait a moment, then refresh.' : 'Review desk data could not load. Try again.');
      const value: OversightSnapshot = await response.json();
      if (!value || typeof value.totalDeals !== 'number' || !value.audit || !Array.isArray(value.deadlines) || !Array.isArray(value.disputes)) throw new Error('Review desk data could not be read. Try again.');
      if (!signal?.aborted) setSnapshot(value);
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error && e.name === 'TimeoutError' ? 'Review desk data took too long to load. Try again.' : e instanceof Error ? e.message : 'Review desk data could not load. Try again.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const abort = new AbortController(); void load(abort.signal); return () => abort.abort(); }, [load]);
  return <div className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">{snapshot ? `Snapshot ${shortDate(snapshot.asOf)} · ${snapshot.totalDeals} deals · ${snapshot.demoDeals} labelled demo deals` : 'Read-only local data'}</p>
      <Button variant="ghost" disabled={loading} onClick={() => void load()}>{loading ? 'Refreshing…' : 'Refresh snapshot'}</Button>
    </div>
    {!licenseKey && snapshot && <Notice>AG Studio licence is not configured. A saved snapshot summary is shown below.</Notice>}
    {error && <Notice tone="warning">{error}</Notice>}
    {loading && !snapshot && <p role="status" className="p-4 text-sm text-muted">Loading review desk data…</p>}
    {snapshot && !error && (snapshot.totalDeals === 0 ? <Notice>No deals yet. Load labelled demo deals in Settings to explore the dashboard.</Notice>
      : <StudioBoundary key={snapshot.asOf} snapshot={snapshot}>{licenseKey ? <StudioDashboard snapshot={snapshot} licenseKey={licenseKey}/> : <SnapshotFallback snapshot={snapshot}/>}</StudioBoundary>)}
    <div className="space-y-2 text-sm text-muted">
      <p>Dispute charts include deals with a recorded local dispute or external case/freeze, including finished disputes. Escalation is ESCALATE_HUMAN recommendations / all stored recommendations; it is not an accuracy measure. No recommendations means no rate.</p>
      <p>AI counts use saved steps only. Created includes validated checks/translations. Terms previews and unsuccessful outbound-draft attempts are not all logged, so totals are incomplete; ignored drafts cannot be inferred. A draft used more than once on one deal counts once. Zero means no recorded event, not proof of no activity.</p>
      <p>Deadlines are a snapshot; frozen queues are labelled and cannot move payments here. Refresh to update time left. Demo data are examples, not real orders. This dashboard has no payment, sync, tick or decision controls.</p>
    </div>
  </div>;
}
