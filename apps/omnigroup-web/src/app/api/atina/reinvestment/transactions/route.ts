import { reinvestmentBffGet, reinvestmentBffPost } from '@/lib/reinvestment-bff';

export async function GET() {
  return reinvestmentBffGet('/transactions');
}

export async function POST(req: Request) {
  return reinvestmentBffPost('/transactions', req);
}
