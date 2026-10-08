/**
 * Internal catalog quality audit — no invented market data.
 */
import {
  listBaseDeliverables,
  listFullPackageCatalog,
  type DeliverableDefinition,
} from './deliverable-catalog';
import { resolveBaseDeliverableId } from './industry-package-id';
import {
  getPackageAnchorEur,
  getPackageDeliverySpec,
  PACKAGE_DELIVERY_SPECS,
} from './package-delivery-spec';
import { getFactoryPhase } from './factory-phase';
import { getMaintenanceTiersForPackage } from './package-maintenance-tiers';
import { PACKAGE_PROBLEM_SPECS } from './package-industry-problems';

export type PackageValidationStatus = 'VALIDATED' | 'PROBABLE' | 'UNVERIFIED' | 'WEAK' | 'DUPLICATE';

export type CatalogAuditRow = {
  deliverableId: string;
  name: string;
  billing: string;
  category: string;
  currentPriceEur: number;
  pricingConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  validationStatus: PackageValidationStatus;
  maintenanceTiers: ReturnType<typeof getMaintenanceTiersForPackage>;
  primaryProblems: string[];
  flags: string[];
};

function inferValidation(spec: ReturnType<typeof getPackageDeliverySpec>): PackageValidationStatus {
  if (!spec) return 'UNVERIFIED';
  if (spec.includes.length >= 3 && spec.excludes.length >= 2) return 'VALIDATED';
  if (spec.includes.length >= 1) return 'PROBABLE';
  return 'WEAK';
}

function inferFlags(d: DeliverableDefinition, price: number): string[] {
  const flags: string[] = [];
  const r = d.resources;
  const effort =
    r.supportHours + r.infraHours + r.deployComplexity * 2 + (r.aiTokensK > 50 ? 4 : 0);
  const impliedMin = effort * 45;
  if (price > 0 && price < impliedMin * 0.6) flags.push('POSSIBLE_UNDERPRICED');
  if (price > impliedMin * 3.5) flags.push('POSSIBLE_OVERPRICED');
  if (d.billing === 'monthly' && price < 199) flags.push('LOW_MONTHLY_RETAINER');
  return flags;
}

export function buildCatalogAuditReport(): CatalogAuditRow[] {
  const phase = getFactoryPhase();
  // Audit base fulfillment templates; full sellable catalog is ~1000 industry SKUs.
  return listBaseDeliverables().map((d) => {
    const baseId = resolveBaseDeliverableId(d.id);
    const spec = getPackageDeliverySpec(baseId);
    const price = getPackageAnchorEur(baseId, phase);
    const flags = inferFlags(d, price);
    return {
      deliverableId: d.id,
      name: d.name,
      billing: d.billing,
      category: d.category,
      currentPriceEur: price,
      pricingConfidence: spec?.anchorByPhase?.M6 ? 'HIGH' : price > 0 ? 'MEDIUM' : 'LOW',
      validationStatus: inferValidation(spec),
      maintenanceTiers: getMaintenanceTiersForPackage(baseId, d.billing),
      primaryProblems: [
        PACKAGE_PROBLEM_SPECS[baseId]?.primaryProblemTemplate.replace(/\{industry\}/gi, 'Industry') ?? '',
        ...(PACKAGE_PROBLEM_SPECS[baseId]?.secondaryProblems.slice(0, 2) ?? []),
      ].filter(Boolean),
      flags,
    };
  });
}

export function getCatalogAuditSummary() {
  const rows = buildCatalogAuditReport();
  const fullCount = listFullPackageCatalog().length;
  return {
    phase: getFactoryPhase(),
    packageCount: PACKAGE_DELIVERY_SPECS.length,
    basePackageCount: rows.length,
    fullPackageCatalogCount: fullCount,
    rows,
    underpriced: rows.filter((r) => r.flags.includes('POSSIBLE_UNDERPRICED')).map((r) => r.deliverableId),
    overpriced: rows.filter((r) => r.flags.includes('POSSIBLE_OVERPRICED')).map((r) => r.deliverableId),
  };
}
