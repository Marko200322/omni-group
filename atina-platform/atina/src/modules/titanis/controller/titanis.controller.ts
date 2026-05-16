import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { TitanisService } from '../service/titanis.service';

export class TitanisController {
  private readonly service = new TitanisService();

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list(req.user!.userId);
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.create(req.user!.userId, req.body);
    sendCreated(res, data, 'Titanis workspace created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.run(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, data, 'Titanis cycle completed');
  };
}
