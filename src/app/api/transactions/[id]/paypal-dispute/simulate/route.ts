import { openSimulatedPayPalDispute } from '../../../../_shared/disputes';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return openSimulatedPayPalDispute(request, (await context.params).id);
}
