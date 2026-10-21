// A one-page plain-text PDF built by hand, so evidence can be attached to a PayPal dispute
// without a PDF library. Text is reduced to printable ASCII (the built-in Helvetica font has no
// Unicode mapping) and long lines are wrapped.

const PAGE = { width: 595, height: 842, margin: 50, fontSize: 10, leading: 14 };

function ascii(text: string): string {
  return text.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/[\\()]/g, (c) => `\\${c}`);
}

function wrap(line: string, max = 95): string[] {
  const out: string[] = [];
  let rest = line;
  while (rest.length > max) {
    const cut = rest.lastIndexOf(' ', max) > 20 ? rest.lastIndexOf(' ', max) : max;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  out.push(rest);
  return out;
}

export function textPdf(lines: string[]): Uint8Array {
  const maxLines = Math.floor((PAGE.height - 2 * PAGE.margin) / PAGE.leading);
  const rows = lines.flatMap((l) => wrap(ascii(l))).slice(0, maxLines);
  const stream = [
    'BT', `/F1 ${PAGE.fontSize} Tf`, `${PAGE.leading} TL`, `${PAGE.margin} ${PAGE.height - PAGE.margin} Td`,
    ...rows.map((r) => `(${r}) Tj T*`), 'ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => { offsets.push(body.length); body += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}
