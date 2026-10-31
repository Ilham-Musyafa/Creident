// Both new deals and demo seeds use node:crypto randomUUID (lowercase UUID v4).
const DEAL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Read a deal reference as data; never return a destination supplied by the caller. */
export function parseDealRef(input: string): string | null {
  if (input.length > 2048) return null;
  const ref = input.trim();
  if (DEAL_ID.test(ref)) return ref;
  if (!ref || /[\s\\<>"'`]/.test(ref)) return null;
  // Reject traversal and encoded paths before URL parsing can normalize them away.
  const pathPart = ref.split(/[?#]/, 1)[0]!;
  if (pathPart.includes('%') || /\/(?:\.|\.\.)(?:\/|$)/.test(pathPart)) return null;
  try {
    const url = ref.startsWith('/') ? new URL(ref, 'https://creident.invalid') : new URL(ref);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const id = url.pathname.match(/\/deals\/([^/]+)(?:\/|$)/)?.[1];
    return id && DEAL_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}
