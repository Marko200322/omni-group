function validateSessionSecret(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const secret =
    process.env.SESSION_SECRET?.trim() ||
    process.env.AUTH_SESSION_SECRET?.trim() ||
    '';

  const placeholders = [
    'change-me',
    'change_me',
    'placeholder',
    'omnigroup-dev-session-secret',
    'your_session_secret',
  ];

  if (secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters in production');
  }
  const lower = secret.toLowerCase();
  if (placeholders.some((p) => lower.includes(p))) {
    throw new Error('SESSION_SECRET uses a placeholder value — set a strong random secret');
  }
}

export async function register() {
  validateSessionSecret();
}
