import { Request, Response } from 'express';
import type { StrictPaginationQuery } from '../../../api/dto/pagination-query.dto';
import { paginate, sendSuccess } from '../../../utils/response';
import { SubscriptionsService } from '../service/subscriptions.service';

export class SubscriptionsController {
  private readonly service = new SubscriptionsService();

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list(req.user!.userId);
    sendSuccess(res, data);
  };

  current = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.current(req.user!.userId);
    sendSuccess(res, data);
  };

  usage = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.usage(req.user!.userId);
    sendSuccess(res, data);
  };

  adminAll = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as unknown as StrictPaginationQuery;
    const { rows, total, page, limit } = await this.service.adminListAll(q);
    paginate(res, rows, total, page, limit);
  };
}
