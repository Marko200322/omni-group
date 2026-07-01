import type { PlanSlug } from './category-pricing';

/** Implicit deliverable fulfilled when a subscription plan is confirmed (platform access + setup work). */
export const PLAN_IMPLICIT_DELIVERABLE: Record<PlanSlug, string> = {
  starter: 'setup-quick',
  pro: 'setup-full',
  enterprise: 'setup-custom',
};

export function resolvePlanDeliverableId(planSlug: string): string | null {
  const slug = planSlug.trim().toLowerCase();
  if (slug in PLAN_IMPLICIT_DELIVERABLE) {
    return PLAN_IMPLICIT_DELIVERABLE[slug as PlanSlug];
  }
  return null;
}
