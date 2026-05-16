import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { TasksService } from './service/tasks.service';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { sendSuccess, sendCreated, paginate } from '../../utils/response';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { getQueue } from '../../queue/queue';
import logger from '../../utils/logger';

const CreateTaskDto = z
  .object({
    type: z.string().min(1).max(50),
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    priority: z.number().min(1).max(10).default(5),
    payload: z.record(z.unknown()).default({}),
    scheduledAt: z.string().datetime().optional(),
    maxAttempts: z.number().min(1).max(10).default(3),
  })
  .strict();

const TaskIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

const TasksListQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).catch(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.string().max(50).optional(),
    type: z.string().max(50).optional(),
  })
  .strict();

export class TasksModule implements IModule {
  name = 'Tasks';
  slug = 'tasks';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private service: TasksService;

  constructor() {
    this.router = Router();
    this.service = new TasksService();
  }

  async initialize(): Promise<void> {
    this.setupRoutes();
    this.setupWorker();
  }

  private setupWorker(): void {
    try {
      const queue = getQueue('tasks');

      queue.process(async (job) => {
        const { taskId, type, payload } = job.data;
        logger.info(`Processing task ${taskId} of type ${type}`);

        await this.service.updateTaskStatus(taskId, 'running');

        try {
          // Execute task based on type
          const result = await this.executeTask(type, payload);
          await this.service.updateTaskStatus(taskId, 'completed', result);
        } catch (err: any) {
          const isLastAttempt = job.attemptsMade >= (job.opts.attempts || 3) - 1;
          if (isLastAttempt) {
            await this.service.updateTaskStatus(taskId, 'failed', undefined, err.message);
          } else {
            await this.service.updateTaskStatus(taskId, 'retrying');
            throw err; // Bull will retry
          }
        }
      });

      logger.info('Task worker initialized');
    } catch (err) {
      logger.warn('Task worker could not start (Redis may not be available)', { error: err });
    }
  }

  private async executeTask(type: string, payload: Record<string, unknown>): Promise<unknown> {
    switch (type) {
      case 'send_email':
        return { sent: true, to: payload.to, subject: payload.subject };
      case 'scrape_url':
        return { url: payload.url, status: 'scraped', data: {} };
      case 'export_data':
        return { format: payload.format, rows: 0 };
      case 'generate_report':
        return { reportId: `report_${Date.now()}`, generatedAt: new Date() };
      default:
        logger.warn(`Unknown task type: ${type}`);
        return { executed: true, type };
    }
  }

  private setupRoutes(): void {
    this.router.post('/', authenticate, authSessionLimiter, validateQuery(StrictEmptyQueryDto), validateBody(CreateTaskDto), async (req, res) => {
      const task = await this.service.createTask(req.user!.userId, req.body);
      sendCreated(res, task, 'Task created and queued');
    });

    this.router.get(
      '/',
      authenticate,
      authSessionLimiter,
      validateQuery(TasksListQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
      const q = req.query as unknown as z.infer<typeof TasksListQueryDto>;
      const { tasks, total } = await this.service.listTasks(req.user!.userId, {
        page: q.page,
        limit: q.limit,
        status: q.status,
        type: q.type,
      });
      paginate(res, tasks, total, q.page, q.limit);
      }
    );

    this.router.get(
      '/admin/stats',
      authenticate,
      authSessionLimiter,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (_req, res) => {
      const stats = await this.service.getAdminStats();
      sendSuccess(res, stats);
      }
    );

    this.router.get(
      '/:id',
      authenticate,
      authSessionLimiter,
      validateParams(TaskIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const task = await this.service.getTask(req.params.id, req.user!.userId);
        sendSuccess(res, task);
      }
    );

    this.router.post(
      '/:id/cancel',
      authenticate,
      authSessionLimiter,
      validateParams(TaskIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        await this.service.cancelTask(req.params.id, req.user!.userId);
        sendSuccess(res, null, 'Task canceled');
      }
    );

    this.router.post(
      '/:id/retry',
      authenticate,
      authSessionLimiter,
      validateParams(TaskIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        await this.service.retryTask(req.params.id, req.user!.userId);
        sendSuccess(res, null, 'Task queued for retry');
      }
    );
  }
}
