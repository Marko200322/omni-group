/** Shared public-registration flag for UI (build-time NEXT_PUBLIC_ + runtime REGISTRATION_ENABLED). */

function envFlag(value: string | undefined): 'true' | 'false' | 'unset' {
  const v = (value ?? '').trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return 'true';
  if (v === 'false' || v === '0' || v === 'no') return 'false';
  return 'unset';
}

/** Production is closed unless explicitly enabled. Dev stays open unless explicitly false. */
export function isPublicRegistrationOpen(): boolean {
  const runtime = envFlag(process.env.REGISTRATION_ENABLED);
  const publicFlag = envFlag(process.env.NEXT_PUBLIC_REGISTRATION_ENABLED);
  const resolved = publicFlag !== 'unset' ? publicFlag : runtime;
  if (process.env.NODE_ENV === 'production') {
    return resolved === 'true';
  }
  return resolved !== 'false';
}
