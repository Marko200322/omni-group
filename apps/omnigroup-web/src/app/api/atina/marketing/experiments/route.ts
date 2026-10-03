import { marketingBffGet, marketingBffPost } from '@/lib/marketing-bff';

export async function GET() {
  return marketingBffGet('/experiments');
}

export async function POST(req: Request) {
  return marketingBffPost('/experiments', req);
}
