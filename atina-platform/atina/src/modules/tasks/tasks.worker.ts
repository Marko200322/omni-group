import { getQueue } from '../../queue/queue';
import logger from '../../utils/logger';
import { registerAuxiliaryQueueWorkers } from '../../queue/register-workers';
import { executeTaskByType } from './execute-task-by-type';
import type { TasksService } from './service/tasks.service';

export { executeTaskByType } from './execute-task-by-type';

export function setupTasksWorker(service: TasksService): void {
  registerAuxiliaryQueueWorkers();
  try {
    const queue = getQueue('tasks');
    queue.process(async (job) => {
      const { taskId, type, payload } = job.data;
      logger.info(`Processing task ${taskId} of type ${type}`);
      await service.updateTaskStatus(taskId, 'running');
      try {
        const result = await executeTaskByType(type, payload);
        await service.updateTaskStatus(taskId, 'completed', result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const isLastAttempt = job.attemptsMade >= (job.opts.attempts || 3) - 1;
        if (isLastAttempt) {
          await service.updateTaskStatus(taskId, 'failed', undefined, message);
        } else {
          await service.updateTaskStatus(taskId, 'retrying');
          throw err;
        }
      }
    });
    logger.info('Task worker initialized');
  } catch (err) {
    logger.warn('Task worker could not start (Redis may not be available)', { error: err });
  }
}
