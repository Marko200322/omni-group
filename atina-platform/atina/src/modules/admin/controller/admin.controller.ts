import { Request, Response } from 'express';
import { paginate, sendSuccess } from '../../../utils/response';
import type {
  AdminOnboardingRetryAllBodyDtoType,
  AdminOnboardingRetryBodyDtoType,
  AdminOnboardingStatusListQueryDtoType,
  AdminOnboardingUserDetailQueryDtoType,
  AdminOverviewQueryDtoType,
  AdminPaymentsListQueryDtoType,
  AdminLogsListQueryDtoType,
  AdminPatchModuleBodyDtoType,
  AdminPatchPlanBodyDtoType,
  AdminPatchUserBodyDtoType,
  AdminPostLogBodyDtoType,
  AdminUsersListQueryDtoType,
  AdminWorkflowTemplateExecutionStatsQueryDtoType,
} from '../dto/admin.dto';
import type { StrictPaginationQuery } from '../../../api/dto/pagination-query.dto';
import { z } from 'zod';
import { AdminService } from '../service/admin.service';
import { WebPushService } from '../service/web-push.service';

const PushSubscribeDto = z
  .object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  })
  .strict();

export class AdminController {
  private readonly service = new AdminService();
  private readonly webPush = new WebPushService();

  getOverview = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getOverview(req.query as unknown as AdminOverviewQueryDtoType);
    sendSuccess(res, data);
  };

  listUsers = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.listUsers(req.query as unknown as AdminUsersListQueryDtoType);
    paginate(res, result.rows, result.total, result.page, result.limit);
  };

  patchUser = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.patchUser(req.params.id, req.body as AdminPatchUserBodyDtoType);
    sendSuccess(res, result.data, result.message);
  };

  listPayments = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.listPayments(req.query as unknown as AdminPaymentsListQueryDtoType);
    paginate(res, result.rows, result.total, result.page, result.limit);
  };

  listModules = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.service.listModules();
    sendSuccess(res, result.data);
  };

  patchModule = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.patchModule(req.params.id, req.body as AdminPatchModuleBodyDtoType);
    sendSuccess(res, result.data, result.message);
  };

  getPhaseGating = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.getPhaseGating();
    sendSuccess(res, data);
  };

  listPhaseGatingTimeline = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.listPhaseGatingTimeline(req.query as unknown as StrictPaginationQuery);
    paginate(res, result.rows, result.total, result.page, result.limit);
  };

  getWorkflowTemplateExecutionStats = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getWorkflowTemplateExecutionStats(
      req.query as unknown as AdminWorkflowTemplateExecutionStatsQueryDtoType
    );
    sendSuccess(res, data);
  };

  listLogs = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.listLogs(req.query as unknown as AdminLogsListQueryDtoType);
    paginate(res, result.rows, result.total, result.page, result.limit);
  };

  createLog = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.createLog(req.user!.userId, req.body as AdminPostLogBodyDtoType);
    sendSuccess(res, result.data, result.message);
  };

  listPlans = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.service.listPlans();
    sendSuccess(res, result.data);
  };

  patchPlan = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.patchPlan(req.params.id, req.body as AdminPatchPlanBodyDtoType);
    sendSuccess(res, result.data, result.message);
  };

  getHealth = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.getHealth();
    sendSuccess(res, data);
  };

  listOnboardingStatus = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.listOnboardingStatus(
      req.query as unknown as AdminOnboardingStatusListQueryDtoType
    );
    sendSuccess(res, data);
  };

  getOnboardingUserDetail = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getOnboardingUserDetail(
      req.params.userId,
      req.query as unknown as AdminOnboardingUserDetailQueryDtoType
    );
    sendSuccess(res, data);
  };

  retryOnboardingUser = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.retryOnboardingUser(
      req.user!.userId,
      req.params.userId,
      req.body as AdminOnboardingRetryBodyDtoType
    );
    sendSuccess(res, result.data, result.message);
  };

  retryAllOnboarding = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.retryAllOnboarding(
      req.user!.userId,
      req.body as AdminOnboardingRetryAllBodyDtoType
    );
    sendSuccess(res, result.data, result.message);
  };

  getPushVapidPublicKey = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, {
      publicKey: this.webPush.getPublicKey(),
      configured: this.webPush.isConfigured(),
    });
  };

  subscribePush = async (req: Request, res: Response): Promise<void> => {
    const body = PushSubscribeDto.parse(req.body);
    await this.webPush.upsertSubscription(req.user!.userId, body, req.headers['user-agent']);
    sendSuccess(res, { subscribed: true });
  };

  unsubscribePush = async (req: Request, res: Response): Promise<void> => {
    const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
    if (endpoint) await this.webPush.removeSubscription(req.user!.userId, endpoint);
    sendSuccess(res, { unsubscribed: true });
  };
}
