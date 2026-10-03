/**
 * Admin-only DemandIntelligence adapter.
 * Aggregated / static reads only — no bank, payments, CRM, or raw tenant chat.
 * Avoids importing omi-extras / deliverable-catalog at module load (config-heavy).
 */
import {
  CONCEPT_LABEL,
  classifyOmiProblems,
  rankOmiPackages,
  SKU_CAPABILITIES,
  type OmiCapability,
  type OmiProblemConcept,
} from '../../omi/omi-problem-model';
import { CLUSTER_SKUS, type CapabilityCluster } from '../../omi/omi-clusters';
import { observeRevenueAllocations } from './observe';

const DEMAND_ENGINE_VERSION = 'reinvestment-demand-1.0.0';

const PII_HINT =
  /\b[\w.+-]+@[\w.-]+\.\w{2,}\b|\b(?:sk|pk|whsec)_(?:live|test)_[A-Za-z0-9]+\b|\b(?:customer|tenant|org)[_-]?id\b/i;

export type DemandTaxonomy = {
  concepts: readonly string[];
  capabilities: readonly string[];
  skuCapabilities: Record<string, string[]>;
  clusters: Record<string, { skuIds: string[] }>;
  engineVersion: string;
};

export type CatalogBurdenRow = {
  skuId: string;
  category: string;
  billing: string;
  anchorEur: number;
  supportHours: number;
  deployComplexity: number;
};

export type DemandSnapshot = {
  commerce: {
    confirmedPaymentCount: number;
    confirmedRevenueEur: number;
    systemReinvestEur: number;
    kind: 'ACTUAL';
  };
  note: string;
};

export interface DemandIntelligence {
  getTaxonomy(): Promise<DemandTaxonomy>;
  getCatalogBurden(): Promise<CatalogBurdenRow[]>;
  getDemandSnapshot(): Promise<DemandSnapshot>;
  classifyProblemText(redactedText: string): Promise<{
    concepts: string[];
    capabilities: string[];
    topSkuIds: string[];
    refused?: string;
  }>;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export class DefaultDemandIntelligence implements DemandIntelligence {
  async getTaxonomy(): Promise<DemandTaxonomy> {
    const concepts = Object.keys(CONCEPT_LABEL) as OmiProblemConcept[];
    const capabilities = uniqueStrings(
      (Object.values(SKU_CAPABILITIES) as OmiCapability[][]).flat(),
    );
    const skuCapabilities: Record<string, string[]> = {};
    for (const [sku, caps] of Object.entries(SKU_CAPABILITIES)) {
      skuCapabilities[sku] = [...caps];
    }
    const clusters: Record<string, { skuIds: string[] }> = {};
    for (const [cluster, skus] of Object.entries(CLUSTER_SKUS) as Array<
      [CapabilityCluster, Array<{ id: string }>]
    >) {
      clusters[cluster] = { skuIds: skus.map((s) => s.id) };
    }
    return {
      concepts,
      capabilities,
      skuCapabilities,
      clusters,
      engineVersion: DEMAND_ENGINE_VERSION,
    };
  }

  async getCatalogBurden(): Promise<CatalogBurdenRow[]> {
    const { listDeliverables } = await import('../../billing/lib/deliverable-catalog');
    return listDeliverables().map((d) => ({
      skuId: d.id,
      category: d.category,
      billing: d.billing,
      anchorEur: d.anchorEur,
      supportHours: d.resources.supportHours,
      deployComplexity: d.resources.deployComplexity,
    }));
  }

  async getDemandSnapshot(): Promise<DemandSnapshot> {
    const obs = await observeRevenueAllocations();
    return {
      commerce: {
        confirmedPaymentCount: obs.paymentCount,
        confirmedRevenueEur: obs.grossCents / 100,
        systemReinvestEur: obs.systemReinvestCents / 100,
        kind: 'ACTUAL',
      },
      note: 'OMI concept histograms are not persisted yet — use classifyProblemText on redacted aggregates only.',
    };
  }

  async classifyProblemText(redactedText: string): Promise<{
    concepts: string[];
    capabilities: string[];
    topSkuIds: string[];
    refused?: string;
  }> {
    const text = redactedText?.trim() ?? '';
    if (!text) {
      return { concepts: [], capabilities: [], topSkuIds: [], refused: 'empty' };
    }
    if (PII_HINT.test(text)) {
      return {
        concepts: [],
        capabilities: [],
        topSkuIds: [],
        refused: 'pii_or_secret_pattern',
      };
    }
    const classified = classifyOmiProblems(text);
    const { listDeliverables } = await import('../../billing/lib/deliverable-catalog');
    const catalog = listDeliverables().map((d) => ({
      id: d.id,
      name: d.name,
      priceEur: d.anchorEur,
    }));
    const ranked = rankOmiPackages(catalog, classified, { message: text }).slice(0, 5);
    return {
      concepts: classified.concepts,
      capabilities: classified.capabilities,
      topSkuIds: ranked.map((r) => r.id),
    };
  }
}

export function getDemandIntelligence(): DemandIntelligence {
  return new DefaultDemandIntelligence();
}
