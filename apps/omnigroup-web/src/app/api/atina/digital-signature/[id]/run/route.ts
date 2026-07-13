import { bffProxyRun } from '@/lib/atina-bff-route-handlers';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  return bffProxyRun('/api/v1/digital-signature', id, req, { adminOnly: true });
}
