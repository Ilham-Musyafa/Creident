import { editDraft } from '../../../_shared/handlers';

export const runtime = 'nodejs';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return editDraft(request, (await context.params).id);
}
