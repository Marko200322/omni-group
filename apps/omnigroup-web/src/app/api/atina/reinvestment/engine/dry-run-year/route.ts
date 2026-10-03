import { reinvestmentBffPost } from '@/lib/reinvestment-bff';

export async function POST(req: Request) {
  return reinvestmentBffPost('/engine/dry-run-year', req);
}
