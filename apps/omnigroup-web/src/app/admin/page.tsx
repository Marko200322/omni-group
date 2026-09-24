import AdminClient from './AdminClient';
import { loadAdminPageData } from '@/lib/admin-page-data';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  return <AdminClient {...await loadAdminPageData()} section="overview" />;
}
