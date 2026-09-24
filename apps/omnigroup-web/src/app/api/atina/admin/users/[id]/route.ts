import { adminEnterprisePatch } from '@/lib/admin-enterprise-bff';

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  return adminEnterprisePatch(req, 'users', params.id);
}
