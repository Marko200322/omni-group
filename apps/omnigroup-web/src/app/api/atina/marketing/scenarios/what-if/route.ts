import { marketingBffPost } from '@/lib/marketing-bff';

export async function POST(req: Request) {
  return marketingBffPost('/scenarios/what-if', req);
}

