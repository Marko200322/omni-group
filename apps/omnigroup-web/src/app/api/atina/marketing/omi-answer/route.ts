import { marketingBffGet } from '@/lib/marketing-bff';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  return marketingBffGet(`/omi-answer?q=${encodeURIComponent(q)}`);
}
