import { redirect } from 'next/navigation';
import AdminMobileClient from './AdminMobileClient';
import { loadAtinaPublicSnapshot } from '@/lib/atina';
import { fetchAtinaAdminOverview } from '@/lib/atina-admin';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import type { AtinaAdminPayment } from '@/lib/atina-live-types';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function AdminMobilePage() {
  const session = await getServerSession();
  if (!session) redirect('/login?next=/admin/mobile');
  if (session.demo || !isAdminRole(session.user.role)) redirect('/dashboard');

  const snapshot = await loadAtinaPublicSnapshot();
  const { overview } = await fetchAtinaAdminOverview(session);

  let pendingPayments: AtinaAdminPayment[] = [];
  const pr = await fetchAtinaForBff<AtinaAdminPayment[]>(
    '/api/v1/admin/payments?status=processing&limit=50',
    session,
    { method: 'GET' },
  );
  if (pr.ok && Array.isArray(pr.data)) pendingPayments = pr.data;

  return (
    <AdminMobileClient
      snapshot={snapshot}
      sessionEmail={session.user.email}
      overview={overview}
      pendingPayments={pendingPayments}
    />
  );
}
