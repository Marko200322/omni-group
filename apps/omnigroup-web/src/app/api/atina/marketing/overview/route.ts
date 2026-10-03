import { marketingBffGet } from '@/lib/marketing-bff';

export async function GET() {
  return marketingBffGet('/overview');
}

