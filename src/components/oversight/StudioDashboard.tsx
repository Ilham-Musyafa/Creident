'use client';

// This is the only runtime import site for AG Studio. OversightClient loads it on demand.
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AgStudio, AgStudioProvider, createWidgets, type AgWidgetDefinition, type AgGridWidgetOptions } from 'ag-studio-react';
import { studioTheme, type AgDefaultRegistry, type AgDefaultWidgetDefinition, type AgReportState, type AgDataSourcesDefinition } from 'ag-studio';
import Link from 'next/link';
import type { OversightSnapshot } from '../../lib/oversight';
import { shortDate } from '../view';

interface OversightRegistry extends Omit<AgDefaultRegistry, 'widgets'> {
  widgets: readonly (AgDefaultWidgetDefinition | AgWidgetDefinition<'audit-health'>)[];
}
const AuditContext = createContext<OversightSnapshot['audit'] | null>(null);
function AuditHealth() {
  const audit = useContext(AuditContext)!;
  const published = audit.checkpoint;
  const message = !published.available ? published.message : published.result.valid
    ? `Last verified checkpoint: ${shortDate(published.result.createdAt)}` : published.result.reason;
  const changed = published.available && published.result.valid
    ? published.result.transactions.filter(t => t.state === 'rewritten').length : 0;
  return <div className="h-full overflow-y-auto p-2 text-sm text-text">
    <h2 className="mb-3 text-[15px] font-bold text-heading">Audit chain health</h2>
    <p className="text-3xl font-extrabold tabular-nums text-heading">{audit.verified} <span className="text-sm font-medium">verified chains</span></p>
    <p className="mt-2">{audit.events} events · {audit.failed} failed · {audit.empty} empty</p>
    <p className="mt-3 text-xs text-muted [overflow-wrap:anywhere]">{message}</p>
    {changed > 0 && <p className="mt-2 font-semibold text-warning-text">{changed} differ from checkpoint</p>}
    <p className="mt-2 text-xs text-muted">A locally verified chain alone cannot detect a complete rewrite.</p>
    <Link className="mt-2 inline-flex min-h-11 items-center font-semibold underline" href="/audit">Inspect chains &amp; checkpoints →</Link>
  </div>;
}
const gridOptions: AgGridWidgetOptions = { createCellRenderer: () => ({ value }: { value: unknown }) =>
  <span className="block whitespace-pre-line py-2 leading-5 [overflow-wrap:anywhere]">{value == null ? '' : String(value)}</span> };
const configuredWidgets = createWidgets<OversightRegistry>({ additionalTypes: [{ id: 'audit-health', label: 'Audit chain health',
  comp: AuditHealth, form: () => [], defaultSize: { width: 12, height: 17 }, minSize: { width: 1, height: 15 } }] });
const widgets = { ...configuredWidgets, widgets: configuredWidgets.widgets.map(definition =>
  definition.id === 'grid' ? { ...definition, options: gridOptions } : definition) };
const title = (text: string) => ({ title: { enabled: true, text } });
const sum = (id: string) => ({ id, aggregation: 'sum' as const });
const field = (id: string, name: string, numeric = false) => ({ id, name, format: numeric ? 'integerFormat' as const : 'textFormat' as const });
const timeLeft = (minutes: number) => minutes <= 0 ? `Due now (${Math.abs(minutes)}m overdue)`
  : minutes >= 1440 ? `${Math.floor(minutes / 1440)}d ${Math.floor(minutes % 1440 / 60)}h left`
    : minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m left` : `${minutes}m left`;
const statusLabel = (value: string) => ({ RETURN_REQUESTED: 'Return due', FROZEN_EXTERNAL: 'PayPal freeze' } as Record<string, string>)[value]
  ?? value.toLowerCase().split('_').map(word => word[0]!.toUpperCase() + word.slice(1)).join(' ');

function studioData(snapshot: OversightSnapshot): AgDataSourcesDefinition<OversightRegistry> {
  const countDisputes = (key: 'status' | 'type') => {
    const map = new Map<string, number>();
    for (const d of snapshot.disputes) map.set(d[key], (map.get(d[key]) ?? 0) + d.count);
    return [...map].map(([name, count]) => ({ name: key === 'status' ? statusLabel(name) : name, count }));
  };
  return { sources: [
    ...(['status', 'type'] as const).map(id => ({ id, data: countDisputes(id), fields: [field('name', 'Dispute ' + id), field('count', 'Deals', true)] })),
    { id: 'escalation', data: [{ rate: snapshot.escalation.rate === null ? null : Math.round(snapshot.escalation.rate * 1000) / 10 }],
      fields: [{ id: 'rate', name: 'Percent escalated', format: 'decimalFormat' }] },
    { id: 'deadlines', data: snapshot.deadlines.map(d => ({ item: d.item,
      deadline: `${d.kind}: ${timeLeft(d.remainingMinutes)}${d.frozen ? ' · frozen' : ''}`, due: shortDate(d.dueAt) })),
      fields: [field('item', 'Deal'), field('deadline', 'Deadline / time left'), field('due', 'Due (UTC)')] },
    { id: 'assists', data: snapshot.assists.map(a => ({ ...a,
      summary: `${a.feature}\n${a.created} created · ${a.unchanged} unchanged · ${a.edited} edited\n${a.unavailable} unavailable · ${a.injection} injection flagged` })),
      fields: [field('feature', 'Feature'), field('created', 'Created', true), field('unchanged', 'Unchanged', true), field('edited', 'Edited', true),
        field('unavailable', 'Unavailable', true), field('injection', 'Injection flagged', true), field('summary', 'Feature / recorded counts')] },
    { id: 'paypal', data: snapshot.paypal.map(c => ({ state: `${c.status}\n${c.stage}${c.simulated ? ' · simulated' : ''}`, count: c.count })),
      fields: [field('state', 'PayPal case state'), field('count', 'Cases', true)] },
  ] };
}

function report(snapshot: OversightSnapshot, width: number): { state: AgReportState<OversightRegistry>; height: number; narrow: boolean } {
  const narrow = width < 700;
  const grid = (text: string, cols: string[]) => ({ type: 'grid' as const, dataMapping: { cols: cols.map(id => ({ id })) },
    format: { ...title(text), style: { columnAutoSize: false, columnWidth: Math.max(68, Math.floor((width - 64) / cols.length)), headerRow: { wrapText: true } } } });
  const state: AgReportState<OversightRegistry> = { selectedPageId: 'oversight', pages: [{ id: 'oversight',
    widgets: {
      status: { type: 'bar-chart-grouped', dataMapping: { categoryKey: [{ id: 'status.name' }], valueKey: [sum('status.count')] }, format: title('Disputes by status') },
      type: { type: 'bar-chart-grouped', dataMapping: { categoryKey: [{ id: 'type.name' }], valueKey: [sum('type.count')] }, format: title('Disputes by type') },
      rate: { type: 'value', dataMapping: { value: [{ id: 'escalation.rate', aggregation: 'max' }] },
        format: { ...title('Escalation rate (%)'), caption: { enabled: true, text: `${snapshot.escalation.escalated} of ${snapshot.escalation.recommendations} stored recommendations` } } },
      audit: { type: 'audit-health', dataMapping: {}, format: title('Audit chain health') },
      deadlines: grid('Deadline queue', narrow ? ['deadlines.item', 'deadlines.deadline'] : ['deadlines.item', 'deadlines.deadline', 'deadlines.due']),
      assists: grid('AI assists · recorded audit events', narrow ? ['assists.summary'] : ['assists.feature', 'assists.created', 'assists.unchanged', 'assists.edited', 'assists.unavailable', 'assists.injection']),
      paypal: grid('PayPal case states', ['paypal.state', 'paypal.count']),
    }, widgetLayout: {} }] };
  // A fresh layout at each breakpoint: narrow screens use one column of full-width widgets.
  const sizes: Array<[string, number]> = [['status', 19], ['type', 19], ['rate', 11], ['audit', 19], ['deadlines', 24], ['assists', 23], ['paypal', 17]];
  let y = 0;
  if (narrow) for (const [id, h] of sizes) { state.pages[0]!.widgetLayout![id] = { xTrack: 0, yTrack: y, xSpan: 24, ySpan: h }; y += h; }
  else {
    for (const [id, x, row, w, h] of [ ['status', 0, 0, 12, 20], ['type', 12, 0, 12, 20], ['rate', 0, 20, 9, 19], ['audit', 9, 20, 15, 19],
      ['deadlines', 0, 39, 24, 23], ['assists', 0, 62, 24, 22], ['paypal', 0, 84, 24, 17] ] as const)
      state.pages[0]!.widgetLayout![id] = { xTrack: x, yTrack: row, xSpan: w, ySpan: h };
    y = 101;
  }
  // Keep single mobile summary columns readable without a horizontal table scroll.
  if (narrow) state.pages[0]!.widgets!.assists!.format!.style = { columnWidth: Math.max(160, width - 52) };
  return { state, height: y * 16 + 24, narrow };
}

// Canvas charts need resolved colours. Observe theme/system changes and rebuild from CSS tokens.
function useTokens() {
  const [tokens, setTokens] = useState<Record<string, string>>({});
  useEffect(() => {
    const update = () => { const css = getComputedStyle(document.documentElement);
      setTokens({ ...Object.fromEntries(['bg', 'surface', 'surface-2', 'line', 'text', 'muted', 'heading', 'accent', 'inspection-text', 'disputed-text', 'completed-text', 'frozen-text', 'warning-text']
        .map(name => [name, css.getPropertyValue('--' + name).trim()])), font: getComputedStyle(document.body).fontFamily }); };
    update(); const observer = new MutationObserver(update); observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    const media = matchMedia('(prefers-color-scheme: dark)'); media.addEventListener('change', update);
    return () => { observer.disconnect(); media.removeEventListener('change', update); };
  }, []);
  return tokens;
}

export default function StudioDashboard({ snapshot, licenseKey }: { snapshot: OversightSnapshot; licenseKey?: string }) {
  const ref = useRef<HTMLDivElement>(null); const [width, setWidth] = useState(0); const tokens = useTokens();
  useEffect(() => { const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry!.contentRect.width)));
    if (ref.current) observer.observe(ref.current); return () => observer.disconnect(); }, []);
  const data = useMemo(() => studioData(snapshot), [snapshot]);
  const layout = useMemo(() => report(snapshot, width), [snapshot, width]);
  const theme = useMemo(() => studioTheme.withParams({ fontFamily: tokens.font || 'sans-serif', fontSize: 13,
    backgroundColor: tokens.surface || 'var(--surface)', foregroundColor: tokens.text || 'var(--text)', textColor: tokens.text || 'var(--text)',
    subtleTextColor: tokens.muted || 'var(--muted)', borderColor: tokens.line || 'var(--line)', accentColor: tokens.accent || 'var(--accent)',
    studioMinWidth: 0, studioMinHeight: 0, studioCanvasMinWidth: 0, studioCanvasPadding: 0, studioCanvasRowHeight: 16,
    studioWrapperBorder: false, studioWrapperSpacing: 0, studioCanvasBorder: false, studioCanvasShadow: false,
    studioWrapperBackgroundColor: tokens.bg, studioCanvasBackgroundColor: tokens.bg,
    studioWidgetBorderRadius: 22, studioWidgetPadding: 12, studioWidgetBackgroundColor: tokens.surface,
    studioWidgetBorder: { width: 1, color: tokens.line }, studioWidgetTitleFontSize: 15, studioWidgetTitleFontWeight: 700,
    studioWidgetTitleTextColor: tokens.heading, studioWidgetCaptionTextColor: tokens.muted,
    gridFontFamily: tokens.font, gridFontSize: 12, gridRowHeight: layout.narrow ? 100 : 54,
    gridHeaderFontSize: 12, gridHeaderHeight: 44, gridHeaderTextColor: tokens.muted, gridHeaderBackgroundColor: tokens.surface,
    gridCellTextColor: tokens.text, gridDataBackgroundColor: tokens.surface, gridOddRowBackgroundColor: tokens.surface,
    chartFontFamily: tokens.font, chartTextColor: tokens.text, chartSubtleTextColor: tokens.muted,
    chartGridLineColor: tokens.line, chartAxisLineColor: tokens.line,
    chartPaletteFills1Color: tokens['inspection-text'], chartPaletteStrokes1Color: tokens['inspection-text'],
    chartPaletteFills2Color: tokens['disputed-text'], chartPaletteStrokes2Color: tokens['disputed-text'],
    chartPaletteFills3Color: tokens['completed-text'], chartPaletteStrokes3Color: tokens['completed-text'],
  }), [tokens, layout.narrow]);
  return <div ref={ref} className="min-w-0 w-full" aria-label="Reviewer oversight dashboard">
    {width > 0 && tokens.surface ? <AuditContext.Provider value={snapshot.audit}>
      <AgStudioProvider licenseKey={licenseKey}>
        <AgStudio<OversightRegistry> key={`${layout.narrow}:${snapshot.asOf}`} widgets={widgets} theme={theme}
          style={{ width: '100%', height: layout.height }} data={data} initialState={layout.state} mode="view"
          loadThemeGoogleFonts={false} panels={{ view: { left: [], right: [] } }}
          layout={{ minWidth: 0, columns: 24, rowHeight: 16, pagePadding: 0, widgetPadding: 6 }}/>
      </AgStudioProvider>
    </AuditContext.Provider> : <p role="status" className="p-4 text-sm text-muted">Preparing dashboard…</p>}
  </div>;
}
