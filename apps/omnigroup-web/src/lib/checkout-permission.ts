import { NextResponse } from 'next/server';
import type { AuthSession } from './auth-session';
import { sessionHasOrgPermission } from './org-permissions';

export function denyUnlessBillingManage(session: AuthSession): NextResponse | null {
  if (sessionHasOrgPermission(session.user, 'billing.manage')) return null;
  return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
}
