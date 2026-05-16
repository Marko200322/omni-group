import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response';
import { KpiService } from '../service/kpi.service';

export class KpiController {
  private readonly service = new KpiService();

  dashboard = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.getDashboard();
    sendSuccess(res, data);
  };
}
