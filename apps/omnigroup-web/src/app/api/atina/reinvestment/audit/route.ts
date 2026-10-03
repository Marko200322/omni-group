import { reinvestmentBffGet } from '@/lib/reinvestment-bff';

export async function GET() {
  return reinvestmentBffGet('/audit');
}
