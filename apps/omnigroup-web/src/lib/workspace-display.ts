const ROLE_LIKE = /^(system|admin|administrator|user|owner|atina|omni|root|test|operator)$/i;

function firstToken(raw?: string | null): string | null {
  const token = raw?.trim().split(/\s+/).filter(Boolean)[0];
  return token || null;
}

/** Greeting name: skip role-like first tokens such as "System Administrator". */
export function displayFirstName(name?: string | null, email?: string | null): string {
  const fromName = firstToken(name);
  if (fromName && !ROLE_LIKE.test(fromName)) return fromName;
  const local = email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim() ?? '';
  const fromEmail = firstToken(local);
  if (fromEmail && !ROLE_LIKE.test(fromEmail)) return fromEmail;
  // Role-like local-part (e.g. admin@…): greet with a capitalized token, not "there".
  if (fromEmail) {
    return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1).toLowerCase();
  }
  return 'there';
}

/** Compact header label: real name, otherwise email. */
export function displayAccountLabel(name?: string | null, email?: string | null): string {
  const trimmed = name?.trim() ?? '';
  const first = firstToken(trimmed);
  if (trimmed && first && !ROLE_LIKE.test(first)) return trimmed;
  return email?.trim() || trimmed || 'Account';
}

export function formatUnreadCount(count: number | null | undefined): string {
  if (count == null || !Number.isFinite(count) || count <= 0) return '0';
  if (count > 99) return '99+';
  return String(Math.floor(count));
}
