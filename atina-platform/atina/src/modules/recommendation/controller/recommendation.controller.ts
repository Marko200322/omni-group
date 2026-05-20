import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response';
import { RecommendationService } from '../service/recommendation.service';

export class RecommendationController {
  private readonly service = new RecommendationService();

  nextActions = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getNextActions(req.user!.userId);
    sendSuccess(res, data);
  };
}
