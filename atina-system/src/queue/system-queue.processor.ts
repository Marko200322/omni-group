import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

/** Minimal worker za red `system` — spreman za buduće poslove (npr. supply, notifikacije). */
@Processor('system')
export class SystemQueueProcessor extends WorkerHost {
  async process(job: Job): Promise<Record<string, unknown>> {
    return { ok: true, jobName: job.name };
  }
}
