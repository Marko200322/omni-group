import { reinvestmentBffPatch } from '@/lib/reinvestment-bff';

export async function PATCH(req: Request) {
  return reinvestmentBffPatch('/policies/active', req);
}
