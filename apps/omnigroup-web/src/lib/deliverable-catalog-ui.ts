/** Groups deliverables for marketing CatalogSection (not the platform UI). */

import { Briefcase, LineChart, Shield, Wrench, Zap } from 'lucide-react';
import type { CatalogCategory } from './marketing-catalog';
import {
  DELIVERABLE_CATALOG,
  DELIVERABLE_CATEGORY_LABELS,
  type DeliverableDefinition,
} from './deliverable-catalog';
import { calculateDeliverableQuote, formatBillingLabel, type PaymentProviderId } from './dynamic-pricing';
import { formatEur } from './category-pricing';

const CATEGORY_ICONS: Record<DeliverableDefinition['category'], CatalogCategory['icon']> = {
  implementation: Wrench,
  consulting: Briefcase,
  retainer: Shield,
  growth: LineChart,
  vertical: Zap,
};

const CATEGORY_SUBTITLES: Record<DeliverableDefinition['category'], string> = {
  implementation: 'What the platform delivers — ready for your client',
  consulting: 'Analysis, integrations, and process design',
  retainer: 'Monthly delivery and maintenance',
  growth: 'Landing pages, copy, and sales materials',
  vertical: 'Ready-made industry solutions — CRM, AI, automations',
};

export function buildDeliverableCatalogCategories(
  industryCategory?: string | null,
  paymentProvider: PaymentProviderId = 'manual',
  marketIntensity = 55,
  verticalSlug?: string | null,
): CatalogCategory[] {
  const tamEstimateUsd = 50_000 + marketIntensity * 1200;
  const competitionScore = Math.min(100, 30 + Math.round(marketIntensity / 2));

  const byCategory = new Map<DeliverableDefinition['category'], DeliverableDefinition[]>();
  for (const d of DELIVERABLE_CATALOG) {
    const list = byCategory.get(d.category) ?? [];
    list.push(d);
    byCategory.set(d.category, list);
  }

  return (['vertical', 'implementation', 'consulting', 'retainer', 'growth'] as const)
    .filter((cat) => byCategory.has(cat))
    .map((cat) => ({
      id: cat,
      title: DELIVERABLE_CATEGORY_LABELS[cat],
      subtitle: CATEGORY_SUBTITLES[cat],
      icon: CATEGORY_ICONS[cat],
      items: (byCategory.get(cat) ?? []).map((d) => {
        const quote = calculateDeliverableQuote({
          deliverableId: d.id,
          industryCategory,
          verticalSlug,
          paymentProvider,
          marketIntensity,
          tamEstimateUsd,
          competitionScore,
        });
        const query = new URLSearchParams({ service: d.id });
        if (industryCategory) query.set('category', industryCategory);
        if (verticalSlug) query.set('vertical', verticalSlug);
        return {
          id: d.id,
          name: d.name,
          description: d.description,
          priceLabel: `${formatEur(quote.clientPriceEur)} ${formatBillingLabel(d.billing)}`,
          priceMonthly: d.billing === 'monthly' ? quote.clientPriceEur : undefined,
          priceOnce: d.billing === 'one_time' ? quote.clientPriceEur : undefined,
          href: `/contact?${query.toString()}`,
        };
      }),
    }));
}
