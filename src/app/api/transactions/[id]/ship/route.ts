import { ship } from '../../../_shared/handlers';

export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return ship(request, (await context.params).id);
}
