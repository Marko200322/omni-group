import { bffProxyGet } from '@/lib/atina-bff-route-handlers';

export async function GET() {
  return bffProxyGet('/api/v1/deal-offer/status', { adminOnly: true });
}
