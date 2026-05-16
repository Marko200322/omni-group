import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response';
import { TitanMonitorService } from '../service/titan-monitor.service';

export class TitanMonitorController {
  private readonly service = new TitanMonitorService();

  snapshot = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.getSnapshot();
    sendSuccess(res, data);
  };
}
