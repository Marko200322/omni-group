import { query } from '../database/connection';
import { PaymentError } from './errors';

type PlanLimits = { modules?: string | string[] };

export async function assertPlanIncludesModule(
  userId: string,
  moduleSlug: string,
  message?: string,
): Promise<void> {
  const { rows } = await query<{ limits: PlanLimits; role: string }>(
    `SELECT p.limits, u.role FROM users u JOIN plans p ON u.plan_id = p.id WHERE u.id = $1`,
    [userId],
  );
  if (rows[0]?.role === 'admin') return;
  const limits = rows[0]?.limits ?? {};
  const modules = limits.modules;
  if (modules === 'all') return;
  if (Array.isArray(modules) && modules.includes(moduleSlug)) return;
  throw new PaymentError(message ?? `Module "${moduleSlug}" requires a higher plan`);
}

export function planIncludesModule(limits: PlanLimits | undefined, moduleSlug: string): boolean {
  if (!limits) return false;
  const modules = limits.modules;
  if (modules === 'all') return true;
  return Array.isArray(modules) && modules.includes(moduleSlug);
}
