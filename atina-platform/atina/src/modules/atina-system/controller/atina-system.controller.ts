import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { AtinaSystemService } from '../service/atina-system.service';

export class AtinaSystemController {
  private readonly service = new AtinaSystemService();

  status = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.status();
    sendSuccess(res, data);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list(req.user!.userId);
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.create(req.user!.userId, req.body);
    sendCreated(res, data, 'Atina System workspace created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.run(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, data, 'Atina System run completed');
  };
}
