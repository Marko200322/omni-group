import { bffProxyGet } from '@/lib/atina-bff-route-handlers';

type SlugContext = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, context: SlugContext) {
  const { slug } = await context.params;
  return bffProxyGet(`/api/v1/autonomy-loop/verticals/${encodeURIComponent(slug)}/delivery-pack`, { adminOnly: true });
}
