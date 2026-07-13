/** Map internal BFF / Atina error codes to user-facing English copy. */
export function describeAtinaError(code: string | undefined): string {
  if (!code) return 'Something went wrong. Please try again.';
  const map: Record<string, string> = {
    unauthorized: 'Sign in with a real account (not demo) to use this feature.',
    no_access_token: 'Session has no Atina API access — sign out and sign in again.',
    no_session: 'You are not signed in.',
    demo_session: 'Demo mode does not support live features.',
    invalid_credentials: 'Wrong email or password.',
    atina_unreachable: 'Atina API is unavailable. Check that the backend is running on port 3000.',
    session_failed: 'Could not start avatar session. Check AI/avatar settings in Atina .env.',
    chat_failed: 'Avatar chat is currently unavailable.',
    checkout_failed: 'Error creating payment instructions.',
    login_failed: 'Sign-in failed.',
    register_failed: 'Registration failed.',
    email_already_registered: 'This email is already registered.',
    plan_required: 'This feature requires a higher plan.',
  };
  if (map[code]) return map[code];
  if (code.startsWith('http_')) return 'Atina API did not respond. Check the backend.';
  if (code.includes('_failed')) return 'Operation failed. Please try again.';
  return code;
}
