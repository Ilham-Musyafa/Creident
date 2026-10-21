import { canonicalJson, type AuditEvent } from './chain';

/** Neutralize formulas before RFC 4180 quoting; whitespace cannot hide a formula prefix. */
export function csvCell(value: string): string {
  const safe = /^[\s\uFEFF]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function auditCsv(events: readonly AuditEvent[]): string {
  const header = 'seq,ts,actor,type,simulated,prevHash,hash,payload';
  const rows = events.map(event => [
    String(event.seq), event.ts, event.actor, event.type,
    String(event.payload.simulated === true), event.prevHash, event.hash, canonicalJson(event.payload),
  ].map(csvCell).join(','));
  return [header, ...rows].join('\r\n') + '\r\n';
}
