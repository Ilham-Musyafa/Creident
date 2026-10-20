import { courier } from '../../_shared/handlers';

export const runtime = 'nodejs';
export async function GET(request: Request, context: { params: Promise<{ tracking: string }> }) {
  return courier(request, (await context.params).tracking);
}
