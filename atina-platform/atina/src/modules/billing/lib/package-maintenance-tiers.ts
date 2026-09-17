/**
 * Maintenance: 3 optional tiers for one-time packages; included in monthly subscriptions.
 * Keep in sync: apps/omnigroup-web/src/lib/package-maintenance-tiers.ts
 */
import type { DeliverableBilling } from './deliverable-catalog';
import { getPackageDeliverySpec } from './package-delivery-spec';

export type MaintenanceTierId = 'essential' | 'professional' | 'premium';

export type MaintenanceTier = {
  id: MaintenanceTierId;
  label: string;
  monthlyEur: number;
  includes: string[];
  slaHours: number;
};

const THREE_TIERS: Record<
  MaintenanceTierId,
  Omit<MaintenanceTier, 'monthlyEur'> & { priceMultiplier: number }
> = {
  essential: {
    id: 'essential',
    label: 'Essential',
    priceMultiplier: 1,
    slaHours: 48,
    includes: [
      'Monitoring checks',
      'Critical bug fixes',
      'Security patch guidance',
      'Email support',
    ],
  },
  professional: {
    id: 'professional',
    label: 'Professional',
    priceMultiplier: 2,
    slaHours: 24,
    includes: [
      'Everything in Essential',
      'Performance monitoring',
      'Integration health checks',
      'Priority support',
    ],
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    priceMultiplier: 3.5,
    slaHours: 8,
    includes: [
      'Everything in Professional',
      'Proactive optimization',
      'SLA-backed response',
      'Quarterly system review',
    ],
  },
};

/** Monthly retainers include maintenance — no separate tier purchase. */
export function isMaintenanceIncludedInSubscription(billing: DeliverableBilling): boolean {
  return billing === 'monthly' || billing === 'yearly';
}

function maintenanceBaseEur(deliverableId: string): number {
  const complex = ['setup-custom', 'website-ecommerce', 'custom-software', 'integration'].includes(
    deliverableId,
  );
  const medium = ['setup-full', 'website-business', 'white-label-setup', 'landing'].includes(deliverableId);
  if (complex) return 750;
  if (medium) return 450;
  return 299;
}

/** Optional add-on tiers for one-time packages only (3 levels). */
export function getMaintenanceTiersForPackage(
  deliverableId: string,
  billing: DeliverableBilling,
): MaintenanceTier[] | null {
  if (isMaintenanceIncludedInSubscription(billing)) return null;
  if (!getPackageDeliverySpec(deliverableId)) return null;
  const base = maintenanceBaseEur(deliverableId);
  return (Object.keys(THREE_TIERS) as MaintenanceTierId[]).map((id) => {
    const t = THREE_TIERS[id];
    return {
      id: t.id,
      label: t.label,
      monthlyEur: Math.round(base * t.priceMultiplier),
      includes: t.includes,
      slaHours: t.slaHours,
    };
  });
}

export function getMaintenanceTierById(
  deliverableId: string,
  tierId: MaintenanceTierId,
): MaintenanceTier | null {
  return getMaintenanceTiersForPackage(deliverableId, 'one_time')?.find((t) => t.id === tierId) ?? null;
}

const VALID_TIER_IDS = new Set<string>(['essential', 'professional', 'premium']);

/** Resolve optional maintenance add-on for one-time packages (throws on invalid input). */
export function resolveOptionalMaintenanceTier(
  deliverableId: string,
  billing: DeliverableBilling,
  tierId?: string | null,
): MaintenanceTier | null {
  const normalized = tierId?.trim();
  if (!normalized) return null;
  if (isMaintenanceIncludedInSubscription(billing)) {
    throw new Error('Maintenance tiers apply only to one-time packages');
  }
  if (!VALID_TIER_IDS.has(normalized)) {
    throw new Error('Unknown maintenance tier');
  }
  const tier = getMaintenanceTierById(deliverableId, normalized as MaintenanceTierId);
  if (!tier) throw new Error('Maintenance tier not available for this package');
  return tier;
}
