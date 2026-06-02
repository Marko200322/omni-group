import type { AuthSession } from './auth-session';
import type { AtinaAdminOverview } from './atina-live-types';
import { fetchAtinaForBff } from './atina-bff';

export type { AtinaAdminOverview } from './atina-live-types';

export async function fetchAtinaAdminOverview(
  session: AuthSession,
): Promise<{ overview: AtinaAdminOverview | null; error?: string }> {
  const r = await fetchAtinaForBff<AtinaAdminOverview>('/api/v1/admin/overview', session, {
    method: 'GET',
  });
  if (!r.ok || !r.data) {
    return { overview: null, error: r.message ?? `http_${r.status}` };
  }
  return { overview: r.data };
}
