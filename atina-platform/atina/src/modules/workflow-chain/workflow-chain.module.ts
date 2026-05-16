import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { WorkflowChainController } from './controller/workflow-chain.controller';
import {
  BootstrapWorkflowTemplatesDto,
  CloneWorkflowChainDto,
  CreateAndRunWorkflowFromTemplateDto,
  CreateWorkflowFromTemplateDto,
  CreateWorkflowChainDto,
  RerunWorkflowExecutionDto,
  RunWorkflowChainDto,
  UpdateWorkflowChainDto,
  WorkflowExecutionQueryDto,
  WorkflowStepAnalyticsQueryDto,
  WorkflowExecutionStatsQueryDto,
  WorkflowChainIdParamsDto,
  WorkflowExecutionTaskIdParamsDto,
  WorkflowTemplateKeyParamsDto,
} from './dto/workflow-chain.dto';

export class WorkflowChainModule implements IModule {
  name = 'Workflow Chain';
  slug = 'workflow-chain';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new WorkflowChainController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.get(
      '/templates',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listTemplates
    );
    this.router.get(
      '/templates/:templateKey',
      authenticate,
      authSessionLimiter,
      validateParams(WorkflowTemplateKeyParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.previewTemplate
    );
    this.router.post(
      '/templates/bootstrap',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(BootstrapWorkflowTemplatesDto),
      this.controller.bootstrapTemplates
    );
    this.router.post(
      '/templates/:templateKey/create',
      authenticate,
      authSessionLimiter,
      validateParams(WorkflowTemplateKeyParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(CreateWorkflowFromTemplateDto),
      this.controller.createFromTemplate
    );
    this.router.post(
      '/templates/:templateKey/create-and-run',
      authenticate,
      authSessionLimiter,
      validateParams(WorkflowTemplateKeyParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(CreateAndRunWorkflowFromTemplateDto),
      this.controller.createAndRunFromTemplate
    );
    this.router.get(
      '/executions/stats',
      authenticate,
      authSessionLimiter,
      validateQuery(WorkflowExecutionStatsQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.executionStats
    );
    this.router.get(
      '/executions/step-analytics',
      authenticate,
      authSessionLimiter,
      validateQuery(WorkflowStepAnalyticsQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.stepAnalytics
    );
    this.router.get(
      '/executions',
      authenticate,
      authSessionLimiter,
      validateQuery(WorkflowExecutionQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listExecutions
    );
    this.router.get(
      '/executions/:executionTaskId',
      authenticate,
      authSessionLimiter,
      validateParams(WorkflowExecutionTaskIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getExecution
    );
    this.router.post(
      '/executions/:executionTaskId/rerun',
      authenticate,
      authSessionLimiter,
      validateParams(WorkflowExecutionTaskIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RerunWorkflowExecutionDto),
      this.controller.rerunExecution
    );
    this.router.get(
      '/:id',
      authenticate,
      authSessionLimiter,
      validateParams(WorkflowChainIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.get
    );
    this.router.get(
      '/:id/validate',
      authenticate,
      authSessionLimiter,
      validateParams(WorkflowChainIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.validate
    );
    this.router.patch(
      '/:id',
      authenticate,
      authSessionLimiter,
      validateParams(WorkflowChainIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(UpdateWorkflowChainDto),
      this.controller.update
    );
    this.router.post(
      '/:id/pause',
      authenticate,
      authSessionLimiter,
      validateParams(WorkflowChainIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.pause
    );
    this.router.post(
      '/:id/activate',
      authenticate,
      authSessionLimiter,
      validateParams(WorkflowChainIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.activate
    );
    this.router.post(
      '/:id/clone',
      authenticate,
      authSessionLimiter,
      validateParams(WorkflowChainIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(CloneWorkflowChainDto),
      this.controller.clone
    );
    this.router.delete(
      '/:id',
      authenticate,
      authSessionLimiter,
      validateParams(WorkflowChainIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.delete
    );
    this.router.post(
      '/',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(CreateWorkflowChainDto),
      this.controller.create
    );
    this.router.post(
      '/:id/run',
      authenticate,
      authSessionLimiter,
      validateParams(WorkflowChainIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunWorkflowChainDto),
      this.controller.run
    );
  }
}
