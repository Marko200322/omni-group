import { Request, Response } from 'express';
import { paginate, sendCreated, sendSuccess } from '../../../utils/response';
import type { TasksListQueryType } from '../dto/tasks.dto';
import type { CreateTaskInput } from '../service/tasks.service';
import { TasksService } from '../service/tasks.service';

export class TasksController {
  constructor(private readonly service: TasksService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const task = await this.service.createTask(req.user!.userId, req.body as CreateTaskInput);
    sendCreated(res, task, 'Task created and queued');
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as unknown as TasksListQueryType;
    const { tasks, total } = await this.service.listTasks(req.user!.userId, q);
    paginate(res, tasks, total, q.page, q.limit);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const task = await this.service.getTask(req.params.id, req.user!.userId);
    sendSuccess(res, task);
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    await this.service.cancelTask(req.params.id, req.user!.userId);
    sendSuccess(res, null, 'Task canceled');
  };

  retry = async (req: Request, res: Response): Promise<void> => {
    await this.service.retryTask(req.params.id, req.user!.userId);
    sendSuccess(res, null, 'Task queued for retry');
  };

  adminStats = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getAdminStats());
  };
}
