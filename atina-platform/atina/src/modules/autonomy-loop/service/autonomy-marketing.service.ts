import { config } from '../../../config';
import { getBusinessDevClient } from '../../../integrations';
import logger from '../../../utils/logger';

export type MarketingSpendResult = {
  ok: boolean;
  simulated: boolean;
  channel: string;
  amountUsd: number;
  detail?: Record<string, unknown>;
  reason?: string;
};

/** Umeren marketing spend preko BUSINESS_AND_DEV agregatora (Nango / marketing API). */
export class AutonomyMarketingService {
  private readonly businessDev = getBusinessDevClient();

  async spendForVertical(
    slug: string,
    category: string,
    amountUsd: number,
    priorityScore: number
  ): Promise<MarketingSpendResult> {
    if (!config.autonomy.budget.marketingEnabled) {
      return {
        ok: false,
        simulated: true,
        channel: 'disabled',
        amountUsd: 0,
        reason: 'marketing_disabled',
      };
    }

    if (priorityScore < config.autonomy.budget.marketingMinPriority) {
      return {
        ok: false,
        simulated: true,
        channel: 'skipped',
        amountUsd: 0,
        reason: 'priority_below_threshold',
      };
    }

    const payload = {
      verticalSlug: slug,
      category,
      action: 'micro_boost',
      maxBudgetUsd: amountUsd,
      channels: ['email_outreach', 'social_micro'],
      note: `Autonomy Loop umeren marketing za ${slug}`,
    };

    if (this.businessDev.isConfigured()) {
      const res = await this.businessDev.requestMarketingSpend(payload);
      if (res) {
        return {
          ok: true,
          simulated: Boolean(res.simulated),
          channel: typeof res.channel === 'string' ? res.channel : 'business_dev',
          amountUsd,
          detail: res,
        };
      }
    }

    logger.info('Autonomy marketing simulated (business_dev not configured)', { slug, amountUsd });
    return {
      ok: true,
      simulated: true,
      channel: 'simulated_queue',
      amountUsd,
      detail: { queued: true, payload },
    };
  }
}
