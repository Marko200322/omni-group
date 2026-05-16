import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { ApexPredatorService } from '../service/apex-predator.service';

export class ApexPredatorController {
  private readonly service = new ApexPredatorService();

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list(req.user!.userId);
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.create(req.user!.userId, req.body);
    sendCreated(res, data, 'Apex Predator profile created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.run(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, data, 'Apex Predator cycle completed');
  };

  riskGrid = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.riskGrid();
    sendSuccess(res, data);
  };
}
