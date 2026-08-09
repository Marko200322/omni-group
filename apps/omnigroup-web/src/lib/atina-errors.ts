/** Map internal BFF / Atina error codes to user-facing English copy. */
export function describeAtinaError(code: string | undefined): string {
  if (!code) return 'Something went wrong. Please try again.';
  const map: Record<string, string> = {
    unauthorized: 'Please sign in to use this feature.',
    no_access_token: 'Your session has expired — please sign out and sign in again.',
    no_session: 'You are not signed in.',
    demo_session: 'This feature is not available in demo mode.',
    invalid_credentials: 'Wrong email or password.',
    atina_unreachable: 'The service is temporarily unavailable. Please try again in a moment.',
    session_failed: 'Could not start the session. Please try again shortly.',
    chat_failed: 'The assistant is temporarily unavailable. Please try again shortly.',
    checkout_failed: 'We couldn’t create the payment instructions. Please try again.',
    login_failed: 'Sign-in failed. Please try again.',
    register_failed: 'Registration failed. Please try again.',
    email_already_registered: 'This email is already registered.',
    plan_required: 'This feature requires a higher plan.',
  };
  if (map[code]) return map[code];
  if (code.startsWith('http_')) return 'The service didn’t respond. Please try again in a moment.';
  if (code.includes('_failed')) return 'Something went wrong. Please try again.';
  // Never surface a raw internal code to the client.
  return 'Something went wrong. Please try again.';
}
