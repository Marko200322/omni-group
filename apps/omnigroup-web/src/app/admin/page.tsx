import AdminClient from './AdminClient';
import { loadAtinaPublicSnapshot } from '@/lib/atina';
import { getServerSession } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getServerSession();
  const snapshot = await loadAtinaPublicSnapshot();
  return (
    <AdminClient snapshot={snapshot} sessionUser={session?.user ?? null} isDemo={session?.demo ?? false} />
  );
}
