import { Router } from 'express';
import { z } from 'zod';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { adminMutationLimiter, authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { AdminController } from './controller/admin.controller';
import {
  AdminOverviewQueryDto,
  AdminWorkflowTemplateExecutionStatsQueryDto,
  AdminUsersListQueryDto,
  AdminPaymentsListQueryDto,
  AdminLogsListQueryDto,
  AdminPhaseGatingTimelineQueryDto,
  AdminOnboardingStatusListQueryDto,
  AdminOnboardingUserDetailQueryDto,
  AdminPatchUserBodyDto,
  AdminPatchModuleBodyDto,
  AdminPostLogBodyDto,
  AdminPatchPlanBodyDto,
  AdminOnboardingRetryBodyDto,
  AdminOnboardingRetryAllBodyDto,
} from './dto/admin.dto';

const AdminEntityIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

const AdminOnboardingUserIdParamsDto = z
  .object({
    userId: z.string().uuid(),
  })
  .strict();

export class AdminModule implements IModule {
  name = 'Admin Panel';
  slug = 'admin';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new AdminController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    const auth = [authenticate, requireAdmin, authSessionLimiter];

    this.router.get(
      '/overview',
      ...auth,
      validateQuery(AdminOverviewQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getOverview
    );

    this.router.get(
      '/users',
      ...auth,
      validateQuery(AdminUsersListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listUsers
    );

    this.router.patch(
      '/users/:id',
      ...auth,
      adminMutationLimiter,
      validateParams(AdminEntityIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(AdminPatchUserBodyDto),
      this.controller.patchUser
    );

    this.router.get(
      '/payments',
      ...auth,
      validateQuery(AdminPaymentsListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listPayments
    );

    this.router.get(
      '/modules',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listModules
    );

    this.router.patch(
      '/modules/:id',
      ...auth,
      adminMutationLimiter,
      validateParams(AdminEntityIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(AdminPatchModuleBodyDto),
      this.controller.patchModule
    );

    this.router.get(
      '/phase-gating',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getPhaseGating
    );

    this.router.get(
      '/phase-gating/timeline',
      ...auth,
      validateQuery(AdminPhaseGatingTimelineQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listPhaseGatingTimeline
    );

    this.router.get(
      '/workflow/templates/execution-stats',
      ...auth,
      validateQuery(AdminWorkflowTemplateExecutionStatsQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getWorkflowTemplateExecutionStats
    );

    this.router.get(
      '/logs',
      ...auth,
      validateQuery(AdminLogsListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listLogs
    );

    this.router.post(
      '/logs',
      ...auth,
      adminMutationLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(AdminPostLogBodyDto),
      this.controller.createLog
    );

    this.router.get(
      '/plans',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listPlans
    );

    this.router.patch(
      '/plans/:id',
      ...auth,
      adminMutationLimiter,
      validateParams(AdminEntityIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(AdminPatchPlanBodyDto),
      this.controller.patchPlan
    );

    this.router.get(
      '/health',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getHealth
    );

    this.router.get(
      '/onboarding-status',
      ...auth,
      validateQuery(AdminOnboardingStatusListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listOnboardingStatus
    );

    this.router.get(
      '/onboarding-status/:userId',
      ...auth,
      validateParams(AdminOnboardingUserIdParamsDto),
      validateQuery(AdminOnboardingUserDetailQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getOnboardingUserDetail
    );

    this.router.post(
      '/onboarding-status/:userId/retry',
      ...auth,
      adminMutationLimiter,
      validateParams(AdminOnboardingUserIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(AdminOnboardingRetryBodyDto),
      this.controller.retryOnboardingUser
    );

    this.router.post(
      '/onboarding-status/retry-all',
      ...auth,
      adminMutationLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(AdminOnboardingRetryAllBodyDto),
      this.controller.retryAllOnboarding
    );
  }

  async shutdown(): Promise<void> {}
}
