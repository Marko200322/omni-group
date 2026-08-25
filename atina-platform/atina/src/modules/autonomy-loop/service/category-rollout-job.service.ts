import { randomUUID } from 'crypto';
import type { CategoryRolloutDtoType } from '../dto/autonomy-loop.dto';
import { AutonomyRolloutJobRepository } from '../repository/autonomy-rollout-job.repository';
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

function mapRow(row: {
  id: string;
  status: RolloutJobStatus;
  request: CategoryRolloutDtoType;
  result: Record<string, unknown> | null;
  error_message: string | null;
  started_at: Date;
  finished_at: Date | null;
}): RolloutJob {
  return {
    id: row.id,
    status: row.status,
    startedAt: row.started_at.toISOString(),
    finishedAt: row.finished_at ? row.finished_at.toISOString() : null,
    request: row.request,
    result: row.result,
    error: row.error_message,
  };
}

export class CategoryRolloutJobService {
  private readonly rollout = new CategoryRolloutService();
  private readonly jobs = new AutonomyRolloutJobRepository();

  async getActiveJob(): Promise<RolloutJob | null> {
    if (activeJob?.status === 'running') return activeJob;
    try {
      const row = await this.jobs.getActive();
      if (row) return mapRow(row);
    } catch {
      /* table may not exist yet */
    }
    return activeJob;
  }

  async getLastJob(): Promise<RolloutJob | null> {
    const active = await this.getActiveJob();
    if (active) return active;
    if (lastCompletedJob) return lastCompletedJob;
    try {
      const row = await this.jobs.getLatest();
      if (row) return mapRow(row);
    } catch {
      /* table may not exist yet */
    }
    return null;
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

    void this.jobs.insert({ id: job.id, userId, request: dto }).catch(() => {
      /* persistence optional until migration applied */
    });

    void this.rollout
      .processRollout(userId, dto)
      .then((result) => {
        job.status = 'completed';
        job.finishedAt = new Date().toISOString();
        job.result = result as unknown as Record<string, unknown>;
        lastCompletedJob = job;
        activeJob = null;
        void this.jobs.markCompleted(job.id, job.result).catch(() => undefined);
      })
      .catch((err) => {
        job.status = 'failed';
        job.finishedAt = new Date().toISOString();
        job.error = err instanceof Error ? err.message : String(err);
        lastCompletedJob = job;
        activeJob = null;
        void this.jobs.markFailed(job.id, job.error).catch(() => undefined);
      });

    return job;
  }
}

export function resetRolloutJobsForTests() {
  activeJob = null;
  lastCompletedJob = null;
}
