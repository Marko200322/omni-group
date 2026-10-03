import { buildAuthSession, isAdminRole, setSessionCookie, type AuthSession } from '@/lib/auth-session';
import type { AtinaLoginResult } from '@/lib/atina-auth';

export async function completeWebLogin(
  result: AtinaLoginResult,
  rememberMe?: boolean,
): Promise<{ session: AuthSession; redirectTo: string }> {
  const session = buildAuthSession({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    rememberMe,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      organizationId: result.user.organizationId,
      orgRole: result.user.orgRole,
    },
  });
  await setSessionCookie(session);
  return {
    session,
    redirectTo: isAdminRole(session.user.role) ? '/admin' : '/dashboard',
  };
}
