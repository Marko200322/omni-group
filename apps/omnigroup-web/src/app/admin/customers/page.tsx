import AdminClient from '../AdminClient';
import { loadAdminPageData } from '@/lib/admin-page-data';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  return <AdminClient {...await loadAdminPageData()} section="customers" />;
}
