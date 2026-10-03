import { reinvestmentBffPost } from '@/lib/reinvestment-bff';

export async function POST(req: Request) {
  return reinvestmentBffPost('/scenarios', req);
}
