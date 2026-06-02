import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { StrictPaginationQueryDto } from '../../api/dto/pagination-query.dto';
import { AutomationController } from './controller/automation.controller';
import {
  AutomationTaskUuidParamsDto,
  AutomationWorkflowStep,
  CreateWorkflowDto,
  ExecuteWorkflowDto,
} from './dto/automation.dto';
import type { AutomationWorkflowPayload } from './dto/automation.dto';
import { AutomationService } from './service/automation.service';

/** @deprecated Import from `./dto/automation.dto` */
export type { AutomationWorkflowStep, AutomationWorkflowPayload } from './dto/automation.dto';
export {
  WorkflowStepSchema,
  CreateWorkflowDto,
  ExecuteWorkflowDto,
  AutomationTaskUuidParamsDto,
} from './dto/automation.dto';

export class AutomationModule implements IModule {
  name = 'Automation';
  slug = 'automation';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  readonly service = new AutomationService();
  private readonly controller: AutomationController;

  constructor() {
    this.router = Router();
    this.controller = new AutomationController(this.service);
  }

  get schedulerInterval(): NodeJS.Timeout | null {
    return this.service.schedulerInterval;
  }

  executeWorkflow(
    workflowData: AutomationWorkflowPayload,
    context: Record<string, unknown> = {}
  ) {
    return this.service.runner.executeWorkflow(workflowData, context);
  }

  async initialize(): Promise<void> {
    this.service.startScheduledWorkflows();
    this.router.get(
      '/workflows',
      authenticate,
      validateQuery(StrictPaginationQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listWorkflows
    );
    this.router.post(
      '/workflows',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(CreateWorkflowDto),
      this.controller.createWorkflow
    );
    this.router.post(
      '/workflows/:id/execute',
      authenticate,
      validateParams(AutomationTaskUuidParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(ExecuteWorkflowDto),
      this.controller.executeWorkflow
    );
    this.router.get(
      '/executions/:id',
      authenticate,
      validateParams(AutomationTaskUuidParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getExecution
    );
    this.router.delete(
      '/workflows/:id',
      authenticate,
      validateParams(AutomationTaskUuidParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.deleteWorkflow
    );
    this.router.get(
      '/executions',
      authenticate,
      validateQuery(StrictPaginationQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listExecutions
    );
  }

  async shutdown(): Promise<void> {
    this.service.stopScheduledWorkflows();
  }
}
