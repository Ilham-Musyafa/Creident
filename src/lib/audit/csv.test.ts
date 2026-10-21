import { describe, expect, it } from 'vitest';
import { auditCsv, csvCell } from './csv';

describe('CSV cells', () => {
  it('quotes commas, doubled quotes, and CR/LF without losing data', () => {
    expect(csvCell('A, "quoted" value\r\non two lines')).toBe('"A, ""quoted"" value\r\non two lines"');
    expect(csvCell('')).toBe('""');
  });
  it.each(['=1+1', '+SUM(A1)', '-1+1', '@SUM(A1)', '\t=1+1', '\r\n+1', '  -1', '\uFEFF@A1'])('neutralizes formula prefix %j', value => {
    expect(csvCell(value)).toBe(`"'${value}"`);
  });
  it('exports an empty chain as a header only', () => {
    expect(auditCsv([])).toBe('seq,ts,actor,type,simulated,prevHash,hash,payload\r\n');
  });
});
