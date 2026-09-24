import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from './atina-bff';
import { clientSafeBffError } from './atina-bff-route-handlers';
import { requireAdminSession } from './bff-admin-gate';

type EntityKind = 'users' | 'plans' | 'modules';
type JsonRecord = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidRequest(detail: string) {
  return NextResponse.json({ ok: false, error: 'invalid_request', detail }, { status: 400 });
}

function hasOnlyKeys(body: JsonRecord, allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed);
  return Object.keys(body).every((key) => allowedSet.has(key));
}

function validatePatch(kind: EntityKind, body: JsonRecord): string | null {
  if (Object.keys(body).length === 0) return 'At least one change is required.';

  if (kind === 'users') {
    if (!hasOnlyKeys(body, ['role', 'isActive', 'planId'])) return 'Unsupported user field.';
    if (body.role !== undefined && !['admin', 'user', 'moderator'].includes(String(body.role))) {
      return 'Role must be admin, moderator, or user.';
    }
    if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
      return 'isActive must be boolean.';
    }
    if (
      body.planId !== undefined &&
      body.planId !== null &&
      (typeof body.planId !== 'string' || !UUID_PATTERN.test(body.planId))
    ) {
      return 'planId must be a UUID or null.';
    }
    return null;
  }

  if (kind === 'modules') {
    if (!hasOnlyKeys(body, ['isActive', 'config'])) return 'Unsupported module field.';
    if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
      return 'isActive must be boolean.';
    }
    if (
      body.config !== undefined &&
      (typeof body.config !== 'object' || body.config === null || Array.isArray(body.config))
    ) {
      return 'config must be an object.';
    }
    return null;
  }

  if (
    !hasOnlyKeys(body, [
      'name',
      'description',
      'price_monthly',
      'price_yearly',
      'is_active',
      'is_popular',
      'features',
      'limits',
      'sort_order',
    ])
  ) {
    return 'Unsupported plan field.';
  }
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 255)) {
    return 'name must be between 1 and 255 characters.';
  }
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 5000)) {
    return 'description must be at most 5000 characters.';
  }
  for (const field of ['price_monthly', 'price_yearly'] as const) {
    const value = body[field];
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      return `${field} must be a non-negative number.`;
    }
  }
  for (const field of ['is_active', 'is_popular'] as const) {
    if (body[field] !== undefined && typeof body[field] !== 'boolean') {
      return `${field} must be boolean.`;
    }
  }
  if (body.sort_order !== undefined && (!Number.isInteger(body.sort_order) || typeof body.sort_order !== 'number')) {
    return 'sort_order must be an integer.';
  }
  return null;
}

export async function adminEnterpriseGet(
  upstreamPath: string,
  errorCode: string,
) {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;

  const result = await fetchAtinaForBff<unknown>(upstreamPath, gate.session, { method: 'GET' });
  if (!result.ok) {
    return clientSafeBffError(errorCode, result.message, result.status || 502);
  }
  return NextResponse.json({ ok: true, data: result.data, meta: result.meta ?? null });
}

export async function adminEnterprisePatch(
  req: Request,
  kind: EntityKind,
  id: string,
) {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  if (!UUID_PATTERN.test(id)) return invalidRequest('Invalid entity id.');

  let body: JsonRecord;
  try {
    const value = await req.json();
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return invalidRequest('JSON body must be an object.');
    }
    body = value as JsonRecord;
  } catch {
    return invalidRequest('Invalid JSON body.');
  }

  const validationError = validatePatch(kind, body);
  if (validationError) return invalidRequest(validationError);

  const result = await fetchAtinaForBff<unknown>(
    `/api/v1/admin/${kind}/${encodeURIComponent(id)}`,
    gate.session,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!result.ok) {
    return clientSafeBffError(`${kind}_update_failed`, result.message, result.status || 502);
  }
  return NextResponse.json({ ok: true, data: result.data, message: result.message ?? 'Updated' });
}
