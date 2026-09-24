import DashboardClient from '../DashboardClient';
import { loadDashboardPageData } from '@/lib/dashboard-page-data';

export const dynamic = 'force-dynamic';

export default async function DashboardSupportPage() {
  return <DashboardClient {...await loadDashboardPageData()} section="support" />;
}
