import { pay } from '../../../_shared/handlers';

export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return pay(request, (await context.params).id);
}
