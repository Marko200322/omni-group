import AdminClient from './AdminClient';
import { loadAtinaPublicSnapshot } from '@/lib/atina';
import { fetchAtinaAdminOverview } from '@/lib/atina-admin';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import type { AtinaAdminPayment } from '@/lib/atina-live-types';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getServerSession();
  const snapshot = await loadAtinaPublicSnapshot();
  const overview =
    session && !session.demo && isAdminRole(session.user.role)
      ? (await fetchAtinaAdminOverview(session)).overview
      : null;

  let pendingPayments: AtinaAdminPayment[] = [];
  if (session && !session.demo && isAdminRole(session.user.role)) {
    const pr = await fetchAtinaForBff<AtinaAdminPayment[]>(
      '/api/v1/admin/payments?status=processing&provider=manual&limit=50',
      session,
      { method: 'GET' },
    );
    if (pr.ok && Array.isArray(pr.data)) pendingPayments = pr.data;
  }

  return (
    <AdminClient
      snapshot={snapshot}
      sessionUser={session?.user ?? null}
      isDemo={session?.demo ?? false}
      overview={overview}
      pendingPayments={pendingPayments}
    />
  );
}
