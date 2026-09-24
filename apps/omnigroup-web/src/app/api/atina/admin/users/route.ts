import { NextResponse } from 'next/server';
import { adminEnterpriseGet } from '@/lib/admin-enterprise-bff';

const ALLOWED_QUERY_KEYS = ['page', 'limit', 'search', 'role', 'isActive'] as const;

export async function GET(req: Request) {
  const source = new URL(req.url).searchParams;
  let hasUnknownKey = false;
  source.forEach((_value, key) => {
    if (!(ALLOWED_QUERY_KEYS as readonly string[]).includes(key)) hasUnknownKey = true;
  });
  if (hasUnknownKey) {
    return NextResponse.json({ ok: false, error: 'invalid_query' }, { status: 400 });
  }

  const params = new URLSearchParams();
  for (const key of ALLOWED_QUERY_KEYS) {
    const value = source.get(key);
    if (value !== null && value !== '') params.set(key, value);
  }
  const query = params.size > 0 ? `?${params.toString()}` : '';
  return adminEnterpriseGet(`/api/v1/admin/users${query}`, 'users_list_failed');
}
