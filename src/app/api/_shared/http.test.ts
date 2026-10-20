import { describe, expect, it } from 'vitest';
import { jsonBody, readBodyLimited } from './http';

describe('bounded request bodies', () => {
  it('stops reading an oversized chunked JSON request', async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(9_000));
        controller.enqueue(new Uint8Array(9_000));
      },
      cancel() { cancelled = true; },
    });
    const request = new Request('http://localhost/api/transactions', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body, duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    await expect(jsonBody(request)).rejects.toMatchObject({ status: 413, code: 'BODY_TOO_LARGE' });
    expect(cancelled).toBe(true);
  });

  it('applies the limit to UTF-8 bytes rather than decoded characters', async () => {
    const request = new Request('http://localhost/api/transactions', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ item: 'é'.repeat(9_000) }),
    });
    await expect(jsonBody(request)).rejects.toMatchObject({ status: 413, code: 'BODY_TOO_LARGE' });
  });

  it('rejects an oversized declared length before reading the stream', async () => {
    let reads = 0;
    const body = new ReadableStream<Uint8Array>({ pull() { reads += 1; } });
    const request = new Request('http://localhost/api/transactions', {
      method: 'POST', headers: { 'content-length': '20000' }, body, duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    await expect(readBodyLimited(request, 16_384, 'Too large')).rejects.toMatchObject({ status: 413 });
    expect(reads).toBeLessThanOrEqual(1);
  });
});
