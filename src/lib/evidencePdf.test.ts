import { describe, expect, it } from 'vitest';
import { textPdf } from './evidencePdf';

describe('textPdf', () => {
  it('builds a valid single-page PDF with a correct xref table', () => {
    const bytes = textPdf(['HalcyVault evidence (deal 123)', 'Ünïcode and \\ back\\slash', 'x'.repeat(250)]);
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
});
