import { describe, expect, it } from 'vitest';
import { textPdf } from './evidencePdf';

describe('textPdf', () => {
  it('builds a valid single-page PDF with a correct xref table', () => {
    const bytes = textPdf(['Creident evidence (deal 123)', 'Ünïcode and \\ back\\slash', 'x'.repeat(250)]);
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    const xrefAt = Number(text.match(/startxref\n(\d+)/)![1]);
    expect(text.slice(xrefAt, xrefAt + 4)).toBe('xref');
    const offsets = [...text.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    offsets.forEach((o, i) => expect(text.slice(o, o + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
    expect(text).toContain('\\(deal 123\\)');
    expect(text).not.toMatch(/[^\x00-\x7F]/);
  });
  it('fits every evidence row on one page and escapes delimiters after wrapping', () => {
    const lines = Array.from({ length: 90 }, (_, i) => `Evidence ${i}: ${'x'.repeat(94)}\\() endstream`);
    lines.push('Reviewer reason: final row retained');
    const pdf = new TextDecoder().decode(textPdf(lines, true));
    expect(pdf).toContain('Reviewer reason: final row retained');
    expect(pdf).toContain('/Count 1');
    // No text operand may end with an unpaired escape immediately before its closing delimiter.
    const rows = [...pdf.matchAll(/^\((.*)\) Tj T\*$/gm)].map(m => m[1]!);
    for (const row of rows) {
      const trailing = row.match(/\\+$/)?.[0].length ?? 0;
      expect(trailing % 2).toBe(0);
    }
  });

});
