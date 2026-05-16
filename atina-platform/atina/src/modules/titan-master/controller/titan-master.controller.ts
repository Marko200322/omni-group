import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { TitanMasterService } from '../service/titan-master.service';

export class TitanMasterController {
  private readonly service = new TitanMasterService();

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list(req.user!.userId);
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.create(req.user!.userId, req.body);
    sendCreated(res, data, 'Titan Master system created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.run(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, data, 'Titan Master run completed');
  };

  adminOverview = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.adminOverview();
    sendSuccess(res, data);
  };
}
