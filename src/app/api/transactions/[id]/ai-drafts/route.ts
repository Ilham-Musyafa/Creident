import { createDraft } from '../../../_shared/aiDrafts';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return createDraft(request, (await context.params).id);
}
