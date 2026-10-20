export interface TimeConfig {
  shipByDays: number;
  inspectionDays: number;
  evidenceDays: number;
}

// Defaults decided by the owner on 2026-10-21: ship-by 3, inspection 2, evidence 2 days.
export function getTimeConfig(env: NodeJS.ProcessEnv = process.env): TimeConfig {
  function days(name: string, fallback: number): number {
    const raw = env[name];
    if (raw === undefined || raw === '') return fallback;
    if (!/^[1-9]\d?$/.test(raw) || Number(raw) > 28) throw new Error(`${name} must be 1-28 whole days`);
    return Number(raw);
  }
  return {
    shipByDays: days('SHIP_BY_DAYS', 3),
    inspectionDays: days('INSPECTION_DAYS', 2),
    evidenceDays: days('EVIDENCE_DAYS', 2),
  };
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString();
}
