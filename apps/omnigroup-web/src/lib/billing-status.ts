import { getSaaSPlan, type SaaSPlan } from './saas-plans';
import type { PlanSlug } from './category-pricing';

export type BillingSubscriptionLike = {
  plan_name?: string | null;
  plan_slug?: string | null;
  billing_cycle?: string | null;
  status?: string | null;
  current_period_end?: string | null;
};

const PLAN_SLUGS: PlanSlug[] = ['starter', 'pro', 'enterprise'];

export function asPlanSlug(raw?: string | null): PlanSlug | null {
  const slug = raw?.trim().toLowerCase();
  return PLAN_SLUGS.includes(slug as PlanSlug) ? (slug as PlanSlug) : null;
}

export function saasPlanLabel(slug?: string | null, fallbackName?: string | null): string {
  const planSlug = asPlanSlug(slug);
  if (planSlug) return getSaaSPlan(planSlug).name;
  const name = fallbackName?.trim();
  return name || 'No active plan';
}

export function isSubscriptionCurrentlyActive(
  sub?: BillingSubscriptionLike | null,
  now: Date = new Date(),
): boolean {
  if (!sub) return false;
  const status = (sub.status ?? '').toLowerCase();
  if (status !== 'active') return false;
  if (!sub.current_period_end) return true;
  const end = new Date(sub.current_period_end);
  if (Number.isNaN(end.getTime())) return true;
  return end.getTime() > now.getTime();
}

export function currentPlanLabel(
  sub?: BillingSubscriptionLike | null,
): string {
  if (!isSubscriptionCurrentlyActive(sub)) return 'No active plan';
  return saasPlanLabel(sub?.plan_slug, sub?.plan_name);
}

export function saasPlanBySlug(slug?: string | null): SaaSPlan | null {
  const planSlug = asPlanSlug(slug);
  return planSlug ? getSaaSPlan(planSlug) : null;
}
