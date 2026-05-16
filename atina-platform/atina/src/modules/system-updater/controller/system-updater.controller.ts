import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { SystemUpdaterService } from '../service/system-updater.service';

export class SystemUpdaterController {
  private readonly service = new SystemUpdaterService();

  queue = async (req: Request, res: Response): Promise<void> => {
    const d = req.body;
    const row = await this.service.queue(req.user!.userId, d.targetVersion, d.notes ?? '');
    sendCreated(res, row, 'Updater job queued');
  };

  list = async (_req: Request, res: Response): Promise<void> => {
    const rows = await this.service.list();
    sendSuccess(res, rows);
  };

  finish = async (req: Request, res: Response): Promise<void> => {
    const d = req.body;
    const row = await this.service.finish(req.params.id, d.status, d.result);
    sendSuccess(res, row, 'Updater job finalized');
  };
}
