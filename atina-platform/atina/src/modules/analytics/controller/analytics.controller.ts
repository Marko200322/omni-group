import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response';
import type { TrackEventDtoType } from '../dto/analytics.dto';
import { AnalyticsService } from '../service/analytics.service';

export class AnalyticsController {
  private readonly service = new AnalyticsService();

  track = async (req: Request, res: Response): Promise<void> => {
    await this.service.track(req.user!.userId, req.body as TrackEventDtoType, req);
    sendSuccess(res, null, 'Event tracked');
  };

  dashboard = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.dashboard(req.user!.userId, req.query as never);
    sendSuccess(res, data);
  };

  adminOverview = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.adminOverview();
    sendSuccess(res, data);
  };

  listEvents = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.listEvents(req.user!.userId, req.query as never);
    sendSuccess(res, data);
  };
}
