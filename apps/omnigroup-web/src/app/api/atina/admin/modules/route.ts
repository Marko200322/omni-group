import { adminEnterpriseGet } from '@/lib/admin-enterprise-bff';

export async function GET() {
  return adminEnterpriseGet('/api/v1/admin/modules', 'modules_list_failed');
}
