import { oversightSnapshot } from '../../../../lib/oversight';
import { getApiContext } from '../../_shared/context';
import { json, requireRole, route } from '../../_shared/http';

export const runtime = 'nodejs';
export function GET(request: Request) {
  return route(() => {
    requireRole(request, ['reviewer']);
    const ctx = getApiContext();
    return json(oversightSnapshot(ctx.db, ctx.repo, ctx.now()));
  });
}
