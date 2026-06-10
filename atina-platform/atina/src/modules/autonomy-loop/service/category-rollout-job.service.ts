import { randomUUID } from 'crypto';
import type { CategoryRolloutDtoType } from '../dto/autonomy-loop.dto';
import { CategoryRolloutService } from './category-rollout.service';

export type RolloutJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export type RolloutJob = {
  id: string;
  status: RolloutJobStatus;
  startedAt: string;
  finishedAt: string | null;
  request: CategoryRolloutDtoType;
  result: Record<string, unknown> | null;
  error: string | null;
};

let activeJob: RolloutJob | null = null;
let lastCompletedJob: RolloutJob | null = null;

export class CategoryRolloutJobService {
  private readonly rollout = new CategoryRolloutService();

  getActiveJob(): RolloutJob | null {
    return activeJob;
  }

  getLastJob(): RolloutJob | null {
    return lastCompletedJob ?? activeJob;
  }

  startJob(userId: string | null, dto: CategoryRolloutDtoType): RolloutJob {
    if (activeJob?.status === 'running') {
      return activeJob;
    }

    const job: RolloutJob = {
      id: randomUUID(),
      status: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      request: dto,
      result: null,
      error: null,
    };
    activeJob = job;

    void this.rollout
      .processRollout(userId, dto)
      .then((result) => {
        job.status = 'completed';
        job.finishedAt = new Date().toISOString();
        job.result = result as unknown as Record<string, unknown>;
        lastCompletedJob = job;
        activeJob = null;
      })
      .catch((err) => {
        job.status = 'failed';
        job.finishedAt = new Date().toISOString();
        job.error = err instanceof Error ? err.message : String(err);
        lastCompletedJob = job;
        activeJob = null;
      });

    return job;
  }
}

export function resetRolloutJobsForTests() {
  activeJob = null;
  lastCompletedJob = null;
}
