import { adminEnterpriseGet } from '@/lib/admin-enterprise-bff';

export async function GET() {
  return adminEnterpriseGet('/api/v1/admin/plans', 'plans_list_failed');
}
