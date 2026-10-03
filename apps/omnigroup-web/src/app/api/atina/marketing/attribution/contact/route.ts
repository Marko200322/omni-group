import { marketingBffPost } from '@/lib/marketing-bff';

export async function POST(req: Request) {
  return marketingBffPost('/attribution/contact', req);
}
