import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { AutonomyLoopService } from '../service/autonomy-loop.service';

export class AutonomyLoopController {
  constructor(private readonly service = new AutonomyLoopService()) {}

  status = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.status(), 'Autonomy loop status');
  };

  budget = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.budgetStatus(), 'Autonomy budget status');
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

  getDeliveryPack = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getVerticalDeliveryPack(req.params.slug);
    sendSuccess(res, data, 'Vertical delivery pack');
  };

  research = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.researchVertical(req.params.slug, req.body);
    sendSuccess(res, data, 'Market research completed');
  };

  generate = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.generateVertical(req.params.slug, req.body, req.user?.userId ?? null);
    sendCreated(res, data, 'Vertical artifacts generated');
  };

  processCategoryBatch = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.processCategoryBatch(
      req.user?.userId ?? null,
      req.params.category,
      req.body
    );
    sendSuccess(res, data, `Category batch ${req.params.category} finished`);
  };

  getCategoriesRolloutStatus = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getCategoriesRolloutStatus(), 'Category rollout status');
  };

  processCategoriesRollout = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.processCategoriesRollout(req.user?.userId ?? null, req.body);
    sendSuccess(res, data, 'Category rollout processed');
  };

  startCategoriesRolloutJob = async (req: Request, res: Response): Promise<void> => {
    const data = this.service.startCategoriesRolloutJob(req.user?.userId ?? null, req.body);
    sendCreated(res, data, 'Category rollout job started');
  };

  getCategoriesRolloutJob = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.service.getCategoriesRolloutJob(), 'Category rollout job status');
  };

  outboundStats = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.outboundStats(), 'Outbound queue stats');
  };

  processOutboundSend = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.processOutboundSend(), 'Outbound send queue processed');
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

  runEvolutionTick = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.runEvolutionTick(req.user?.userId ?? null);
    sendSuccess(res, data, 'Platform evolution tick completed');
  };

  listEvolutionTasks = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.listEvolutionTasks(), 'Platform evolution tasks');
  };

  startScheduler = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.service.startScheduler(req.user!.userId), 'Autonomy scheduler started');
  };

  stopScheduler = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.service.stopScheduler(), 'Autonomy scheduler stopped');
  };
}
