import { describe, expect, it } from 'vitest';
import { parseDealRef } from './parseDealRef';

const id = '550e8400-e29b-41d4-a716-446655440000';
describe('parseDealRef', () => {
  it.each([
    id, `  ${id}\n`, `https://creident.example/deals/${id}/checkout`,
    `https://another.example/deals/${id}`, `http://localhost:3000/deals/${id}/checkout?from=seller#terms`,
    `https://another.example/prefix/deals/${id}/evidence?ref=a%20b#proof`,
    `/deals/${id}/checkout`, `//another.example/deals/${id}/checkout`,
  ])('extracts only the UUID from %s', input => {
    expect(parseDealRef(input)).toBe(id);
  });
  it.each([
    '', '   ', 'new', '/deals/new', 'https://example.com/deals/new', 'not-a-deal',
    id.replace('41d4', '11d4'), id.replace('a716', '7716'), id.toUpperCase(),
    `${id}/checkout`, `https://example.com/deals/${id}extra`,
    `https://example.com/deals/${id.slice(0, 12)} ${id.slice(12)}`,
    `https://example.com/../deals/${id}`, `/deals/../deals/${id}`,
    `https://example.com/%2e%2e/deals/${id}`, `https://example.com/%2E./deals/${id}`,
    `https://example.com/deals/${id}/../../checkout`, `https://example.com/deals/${id}/..`,
    `https://example.com/deals%2f${id}`, `https://example.com\\deals\\${id}`,
    `<script>location='https://example.com/deals/${id}'</script>`,
    `javascript:alert('/deals/${id}')`, `data:text/plain,/deals/${id}`, `ftp://example.com/deals/${id}`,
    `https://example.com/no-deal?next=/deals/${id}`, `https://example.com/#/deals/${id}`,
    `https://example.com/deals/${id}?padding=${'x'.repeat(2048)}`, 'x'.repeat(10000),
  ])('rejects invalid, unsafe or oversized input %s', input => {
    expect(parseDealRef(input)).toBeNull();
  });
});
