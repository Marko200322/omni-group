import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { TasksController } from './controller/tasks.controller';
import { CreateTaskDto, TaskIdParamsDto, TasksListQueryDto } from './dto/tasks.dto';
import { TasksService } from './service/tasks.service';
import { setupTasksWorker } from './tasks.worker';

/** @deprecated Import from `./dto/tasks.dto` */
export { CreateTaskDto, TaskIdParamsDto, TasksListQueryDto } from './dto/tasks.dto';

export class TasksModule implements IModule {
  name = 'Tasks';
  slug = 'tasks';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  readonly service: TasksService;
  private readonly controller: TasksController;

  constructor() {
    this.router = Router();
    this.service = new TasksService();
    this.controller = new TasksController(this.service);
  }

  async initialize(): Promise<void> {
    this.router.post(
      '/',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(CreateTaskDto),
      this.controller.create
    );
    this.router.get(
      '/',
      authenticate,
      authSessionLimiter,
      validateQuery(TasksListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.get(
      '/admin/stats',
      authenticate,
      authSessionLimiter,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.adminStats
    );
    this.router.get(
      '/:id',
      authenticate,
      authSessionLimiter,
      validateParams(TaskIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getById
    );
    this.router.post(
      '/:id/cancel',
      authenticate,
      authSessionLimiter,
      validateParams(TaskIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.cancel
    );
    this.router.post(
      '/:id/retry',
      authenticate,
      authSessionLimiter,
      validateParams(TaskIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.retry
    );
    setupTasksWorker(this.service);
  }
}
