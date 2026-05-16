import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SystemQueueService {
  constructor(@InjectQueue('system') private readonly systemQueue: Queue) {}

  /** Enqueue minimal job za proveru Bull + Redis (npr. lokalni smoke). */
  async enqueueSmokeJob(name = 'smoke'): Promise<{ jobId: string | undefined }> {
    const job = await this.systemQueue.add(name, { at: Date.now() });
    return { jobId: job.id };
  }
}
