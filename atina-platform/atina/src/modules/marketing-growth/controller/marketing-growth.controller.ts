import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response';
import { MarketingGrowthOrchestratorService } from '../service/marketing-growth-orchestrator.service';

export class MarketingGrowthController {
  private readonly service = new MarketingGrowthOrchestratorService();

  status = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.status();
    sendSuccess(res, data);
  };
}
