import { bffProxyGet, bffProxyPost } from '@/lib/atina-bff-route-handlers';

export async function GET() {
  return bffProxyGet('/api/v1/outreach', { adminOnly: true });
}

export async function POST(req: Request) {
  return bffProxyPost('/api/v1/outreach', req, { adminOnly: true });
}
