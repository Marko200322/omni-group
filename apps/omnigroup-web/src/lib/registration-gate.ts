import { NextResponse } from 'next/server';
import { isPublicRegistrationOpen } from './registration-public';

/** Block public self-registration unless explicitly enabled in production. */
export function registrationDisabledResponse(): NextResponse | null {
  if (isPublicRegistrationOpen()) return null;
  return NextResponse.json({ ok: false, error: 'registration_disabled' }, { status: 403 });
}
