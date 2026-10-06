import { query } from '../database/connection';
import { PaymentError } from './errors';

type PlanLimits = { modules?: string | string[] };

async function userHasModuleEntitlement(userId: string, moduleSlug: string): Promise<boolean> {
  const { rows } = await query<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM user_modules um
       JOIN modules m ON m.id = um.module_id
       WHERE um.user_id = $1
         AND m.slug = $2
         AND um.is_enabled = true
         AND m.is_active = true
     ) AS ok`,
    [userId, moduleSlug],
  );
  return Boolean(rows[0]?.ok);
}

/** Grant per-user module flags in user_modules (portal entitlements, not task theater). */
export async function grantUserModules(userId: string, moduleSlugs: string[]): Promise<string[]> {
  const granted: string[] = [];
  const unique = [...new Set(moduleSlugs.map((s) => s.trim()).filter(Boolean))];
  for (const slug of unique) {
    const { rows: modRows } = await query<{ id: string }>(
      `SELECT id FROM modules WHERE slug = $1 AND is_active = true LIMIT 1`,
      [slug],
    );
    const moduleId = modRows[0]?.id;
    if (!moduleId) continue;
    await query(
      `INSERT INTO user_modules (user_id, module_id, is_enabled, config)
       VALUES ($1, $2, true, $3::jsonb)
       ON CONFLICT (user_id, module_id) DO UPDATE SET
         is_enabled = true,
         config = COALESCE(user_modules.config, '{}'::jsonb) || EXCLUDED.config,
         created_at = COALESCE(user_modules.created_at, NOW())`,
      [userId, moduleId, JSON.stringify({ source: 'fulfillment-bootstrap', grantedAt: new Date().toISOString() })],
    );
    granted.push(slug);
  }
  return granted;
}

export async function listGrantedUserModules(userId: string): Promise<string[]> {
  const { rows } = await query<{ slug: string }>(
    `SELECT m.slug
     FROM user_modules um
     JOIN modules m ON m.id = um.module_id
     WHERE um.user_id = $1 AND um.is_enabled = true AND m.is_active = true
     ORDER BY m.slug`,
    [userId],
  );
  return rows.map((r) => r.slug);
}

export async function assertPlanIncludesModule(
  userId: string,
  moduleSlug: string,
  message?: string,
): Promise<void> {
  const { rows } = await query<{ limits: PlanLimits; role: string }>(
    `SELECT p.limits, u.role FROM users u LEFT JOIN plans p ON u.plan_id = p.id WHERE u.id = $1`,
    [userId],
  );
  if (rows[0]?.role === 'admin') return;
  const limits = rows[0]?.limits ?? {};
  const modules = limits.modules;
  if (modules === 'all') return;
  if (Array.isArray(modules) && modules.includes(moduleSlug)) return;
  if (await userHasModuleEntitlement(userId, moduleSlug)) return;
  throw new PaymentError(message ?? `Module "${moduleSlug}" requires a higher plan`);
}

export function planIncludesModule(limits: PlanLimits | undefined, moduleSlug: string): boolean {
  if (!limits) return false;
  const modules = limits.modules;
  if (modules === 'all') return true;
  return Array.isArray(modules) && modules.includes(moduleSlug);
}
