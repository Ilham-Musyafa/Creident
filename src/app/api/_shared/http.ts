import { DomainError, type ApplyResult } from '../../../lib/orchestrator';
import { PayPalError } from '../../../lib/paypal/client';
import { ApiSetupError } from './context';
import { reviewerCodeMatches, suppliedReviewerCode } from '../../../lib/reviewerAccess';

export type Role = 'buyer' | 'seller' | 'reviewer';

/**
 * Public origin used to build absolute links that leave the server (payment return and cancel URLs).
 * Behind a host proxy such as Render, request.url shows the internal address (http://localhost:10000),
 * so prefer the platform's external URL, then the forwarded host, then the request itself.
 */
export function publicOrigin(request: Request, env: Record<string, string | undefined> = process.env): string {
  const external = env.RENDER_EXTERNAL_URL;
  if (external) {
    try { return new URL(external).origin; } catch { /* fall through to the headers */ }
  }
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  if (host && /^[A-Za-z0-9.-]+(:\d{1,5})?$/.test(host)) {
    const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'http' ? 'http' : 'https';
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

export function requireRole(request: Request, allowed: readonly Role[], queryRole = false): Role {
  const role = request.headers.get('x-demo-role') ?? (queryRole ? new URL(request.url).searchParams.get('role') : null);
  if (!role || !['buyer', 'seller', 'reviewer'].includes(role)) {
    throw new HttpError(400, 'ROLE_REQUIRED', 'State x-demo-role: buyer, seller, or reviewer');
  }
  if (!allowed.includes(role as Role)) throw new HttpError(403, 'ROLE_FORBIDDEN', 'This demo role cannot perform this action');
  if (role === 'reviewer' && !reviewerCodeMatches(suppliedReviewerCode(request))) {
    throw new HttpError(403, 'REVIEWER_CODE_REQUIRED', 'This demo requires the reviewer access code for reviewer actions');
  }
  return role as Role;
}

/** Stop reading at the configured byte limit, including chunked bodies without Content-Length. */
export async function readBodyLimited(request: Request, maxBytes: number, message: string): Promise<string> {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxBytes) throw new HttpError(413, 'BODY_TOO_LARGE', message);
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, 'BODY_TOO_LARGE', message);
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'JSON_REQUIRED', 'Send application/json');
  }
  const raw = await readBodyLimited(request, 16_384, 'JSON body exceeds 16 KB');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new HttpError(400, 'INVALID_JSON', 'Invalid JSON body'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new HttpError(400, 'INVALID_JSON', 'Expected a JSON object');
  return parsed as Record<string, unknown>;
}

export function stringField(body: Record<string, unknown>, key: string, max = 4096): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new HttpError(400, 'INVALID_INPUT', `${key} must be a nonempty string of at most ${max} characters`);
  }
  return value.trim();
}

export function noExtraFields(body: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new HttpError(400, 'INVALID_INPUT', 'Unknown JSON field');
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) return json({ error: error.code, message: error.message }, error.status);
  if (error instanceof DomainError) return json({ error: error.code, message: error.message }, error.code === 'NOT_FOUND' ? 404 : 409);
  if (error instanceof PayPalError) return json({ error: error.issue ?? error.code, debug_id: error.debugId }, 502);
  if (error instanceof ApiSetupError) return json({ error: 'SANDBOX_CONFIG_MISSING', message: error.message }, 503);
  return json({ error: 'INTERNAL_ERROR' }, 500);
}

export function unwrap(result: ApplyResult): Extract<ApplyResult, { ok: true }> {
  if (!result.ok) throw result.error;
  return result;
}

export function route(fn: () => Promise<Response> | Response): Promise<Response> {
  return Promise.resolve().then(fn).catch(errorResponse);
}
