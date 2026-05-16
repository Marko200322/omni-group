import AdminClient from './AdminClient';
import { loadAtinaPublicSnapshot } from '@/lib/atina';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const snapshot = await loadAtinaPublicSnapshot();
  return <AdminClient snapshot={snapshot} />;
}
