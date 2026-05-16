import DashboardClient from './DashboardClient';
import { loadAtinaPublicSnapshot } from '@/lib/atina';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const snapshot = await loadAtinaPublicSnapshot();
  return <DashboardClient snapshot={snapshot} />;
}
