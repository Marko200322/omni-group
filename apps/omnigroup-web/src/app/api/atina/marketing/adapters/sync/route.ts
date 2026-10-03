import { marketingBffPost } from '@/lib/marketing-bff';

export async function POST(req: Request) {
  return marketingBffPost('/adapters/sync', req);
}
