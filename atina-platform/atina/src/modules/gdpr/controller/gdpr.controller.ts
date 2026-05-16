import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { GdprService } from '../service/gdpr.service';

export class GdprController {
  private readonly service = new GdprService();

  create = async (req: Request, res: Response): Promise<void> => {
    const d = req.body;
    const row = await this.service.create(req.user!.userId, d.requestType, d.payload);
    sendCreated(res, row, 'GDPR request submitted');
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    const rows = await this.service.listForUser(req.user!.userId);
    sendSuccess(res, rows);
  };

  listAll = async (_req: Request, res: Response): Promise<void> => {
    const rows = await this.service.listAll();
    sendSuccess(res, rows);
  };

  process = async (req: Request, res: Response): Promise<void> => {
    const d = req.body;
    const row = await this.service.process(req.params.id, d.status, d.response);
    sendSuccess(res, row, 'GDPR request processed');
  };
}
