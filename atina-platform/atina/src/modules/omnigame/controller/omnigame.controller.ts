import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { OmniGameService } from '../service/omnigame.service';

export class OmniGameController {
  private readonly service = new OmniGameService();

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list(req.user!.userId);
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.create(req.user!.userId, req.body);
    sendCreated(res, data, 'OmniGame project created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.run(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, data, 'OmniGame cycle completed');
  };
}
