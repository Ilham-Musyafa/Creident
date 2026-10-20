import { auditLog } from '../../_shared/handlers';

export const runtime = 'nodejs';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return auditLog(request, (await context.params).id);
}
