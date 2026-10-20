import { openDispute } from '../../../_shared/handlers';

export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return openDispute(request, (await context.params).id);
}
