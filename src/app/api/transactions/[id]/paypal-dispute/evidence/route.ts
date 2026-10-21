import { disputeAction } from '../../../../_shared/disputes';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return disputeAction(request, (await context.params).id, 'evidence');
}
