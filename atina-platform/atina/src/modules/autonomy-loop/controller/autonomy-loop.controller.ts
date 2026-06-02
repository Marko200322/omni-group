import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { AutonomyLoopService } from '../service/autonomy-loop.service';

export class AutonomyLoopController {
  constructor(private readonly service = new AutonomyLoopService()) {}

  status = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.status(), 'Autonomy loop status');
  };

  seedVerticals = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.seedVerticals();
    sendCreated(res, data, `Seeded ${data.inserted} industry verticals`);
  };

  listVerticals = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.listVerticals(req.query as never), 'Industry verticals');
  };

  getVertical = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getVertical(req.params.slug);
    sendSuccess(res, data, 'Industry vertical');
  };

  research = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.researchVertical(req.params.slug, req.body);
    sendSuccess(res, data, 'Market research completed');
  };

  generate = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.generateVertical(req.params.slug, req.body);
    sendCreated(res, data, 'Vertical artifacts generated');
  };

  deploy = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.deployVertical(req.params.slug, req.body, req.user!.userId);
    sendSuccess(res, data, 'Deploy pipeline finished');
  };

  syncFeedback = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.syncFeedback(req.user!.userId, req.body);
    sendSuccess(res, data, 'Revenue feedback synced');
  };

  tick = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.tick(req.user!.userId, req.body);
    sendSuccess(res, data, 'Autonomy tick completed');
  };

  startScheduler = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.service.startScheduler(req.user!.userId), 'Autonomy scheduler started');
  };

  stopScheduler = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.service.stopScheduler(), 'Autonomy scheduler stopped');
  };
}
