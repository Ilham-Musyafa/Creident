import { courierClaimPack } from '../../../_shared/aiDrafts';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return courierClaimPack(request, (await context.params).id);
}
