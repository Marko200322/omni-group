import { config } from '../../../config';
import { OutreachService } from '../../outreach/service/outreach.service';
import type { MarketingGrowthStatusDtoType } from '../dto/marketing-growth.dto';

export class MarketingGrowthOrchestratorService {
  private readonly outreach = new OutreachService();

  async status(): Promise<MarketingGrowthStatusDtoType> {
    let outreachReady = false;
    try {
      const outreachStatus = await this.outreach.status();
      outreachReady = Boolean(outreachStatus && typeof outreachStatus === 'object');
    } catch {
      outreachReady = false;
    }

    const leadPhase = config.leadDatabases.rolloutPhase ?? 'F0';
    const autonomyMarketing = config.autonomy.budget.marketingEnabled ?? false;

    const recommendedActions: string[] = [];
    if (!outreachReady) recommendedActions.push('Configure COMMS or SMTP before outbound sends');
    if (leadPhase === 'F0' || leadPhase === 'F1') {
      recommendedActions.push('Enable lead database F2+ when revenue covers API spend');
    }
    if (!autonomyMarketing) {
      recommendedActions.push('Set AUTONOMY_MARKETING_ENABLED=true at M5 gate');
    }
    if (recommendedActions.length === 0) {
      recommendedActions.push('Run sync:generated-verticals and verify marketing catalog links');
    }

    return {
      outreachEnabled: outreachReady,
      autonomyMarketingEnabled: autonomyMarketing,
      leadDatabasePhase: String(leadPhase),
      recommendedActions,
    };
  }
}
