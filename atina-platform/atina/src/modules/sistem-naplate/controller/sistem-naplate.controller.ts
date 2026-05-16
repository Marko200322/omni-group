import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { SistemNaplateService } from '../service/sistem-naplate.service';

export class SistemNaplateController {
  private readonly service = new SistemNaplateService();

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list(req.user!.userId);
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.create(req.user!.userId, req.body);
    sendCreated(res, data, 'Sistem naplate workspace created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.run(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, data, 'Sistem naplate cycle completed');
  };
}
