import { describe, expect, it } from 'vitest';
import { jsonBody, publicOrigin, readBodyLimited } from './http';

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

describe('public origin for payment links', () => {
  const internal = 'http://localhost:10000/api/transactions/abc/pay';

  it('prefers the platform external URL over the internal request address', () => {
    expect(publicOrigin(new Request(internal), { RENDER_EXTERNAL_URL: 'https://creident.onrender.com' })).toBe('https://creident.onrender.com');
  });

  it('uses the forwarded host and protocol when no external URL is set', () => {
    const request = new Request(internal, { headers: { 'x-forwarded-host': 'creident.onrender.com', 'x-forwarded-proto': 'https' } });
    expect(publicOrigin(request, {})).toBe('https://creident.onrender.com');
  });

  it('ignores a malformed forwarded host and falls back to the request origin', () => {
    const request = new Request(internal, { headers: { 'x-forwarded-host': 'evil.example/path?x=1' } });
    expect(publicOrigin(request, {})).toBe('http://localhost:10000');
  });

  it('keeps the request origin for local development', () => {
    expect(publicOrigin(new Request('http://localhost:3000/api/x'), {})).toBe('http://localhost:3000');
  });
});
