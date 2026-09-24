import DashboardClient from '../DashboardClient';
import { loadDashboardPageData } from '@/lib/dashboard-page-data';

export const dynamic = 'force-dynamic';

export default async function DashboardOrderPage() {
  return <DashboardClient {...await loadDashboardPageData()} section="quote" />;
}
