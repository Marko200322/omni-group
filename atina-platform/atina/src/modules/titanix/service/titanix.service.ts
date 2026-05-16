import { addJob } from '../../../queue/queue';
import { AppError, NotFoundError } from '../../../utils/errors';
import { CreateTitanixWorkspaceDtoType, RunTitanixDtoType } from '../dto/titanix.dto';
import { TitanixRepository } from '../repository/titanix.repository';

export class TitanixService {
  private readonly repo = new TitanixRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateTitanixWorkspaceDtoType) {
    const { rows } = await this.repo.create(
      userId,
      dto.name,
      dto.budgetAllocated,
      dto.executionProfile
    );
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunTitanixDtoType) {
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) throw new NotFoundError('Titanix workspace');

    const tasksQueued: string[] = [];
    const jobs = Math.floor(dto.jobs);
    try {
      for (let i = 1; i <= jobs; i += 1) {
        const name = `Titanix ${dto.pipeline} job #${i}`;
        const { rows } = await this.repo.insertTask(userId, name, {
          pipeline: dto.pipeline,
          slot: i,
          ecosystemSystemId: systemId,
        });
        const taskId = rows[0]?.id as string | undefined;
        if (!taskId) {
          throw new AppError('Failed to create titanix task', 500, 'TITANIX_TASK_CREATE_FAILED', { slot: i });
        }
        tasksQueued.push(taskId);
        await addJob('tasks', { taskId, type: 'titanix_pipeline', payload: { pipeline: dto.pipeline, slot: i } });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown titanix queue error';
      await this.repo.insertRun(systemId, `titanix_${dto.pipeline}`, {
        pipeline: dto.pipeline,
        jobs_requested: jobs,
        jobs_queued: tasksQueued.length,
        task_ids: tasksQueued,
        failed_reason: message,
        state: {
          previous: 'queuing',
          current: 'failed',
        },
      }, 'failed');
      throw error;
    }

    const revenue = dto.pipeline === 'campaign' ? jobs * 28 : dto.pipeline === 'content' ? jobs * 17 : jobs * 12;
    const { rows: runRows } = await this.repo.insertRun(systemId, `titanix_${dto.pipeline}`, {
      pipeline: dto.pipeline,
      jobs_requested: jobs,
      jobs_queued: jobs,
      task_ids: tasksQueued,
      estimated_revenue: revenue,
      projected_revenue: revenue,
      state: {
        previous: 'queuing',
        current: 'completed',
      },
    });
    if (!runRows[0]) {
      throw new AppError('Failed to persist titanix run', 500, 'TITANIX_RUN_PERSIST_FAILED');
    }
    await this.repo.updateAfterRun(systemId, revenue, jobs, dto.pipeline);
    return runRows[0];
  }
}
