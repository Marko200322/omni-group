import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { CraftorService } from '../service/craftor.service';

export class CraftorController {
  private readonly service = new CraftorService();

  catalog = (_req: Request, res: Response): void => {
    sendSuccess(res, this.service.getCatalog());
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list(req.user!.userId);
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.create(req.user!.userId, req.body);
    sendCreated(res, data, 'Craftor V7 campaign created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.run(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, data, 'Craftor V7 cycle completed');
  };
}
