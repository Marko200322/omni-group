import Bull from 'bull';
import { config } from '../config';
import logger from '../utils/logger';

type QueueName = 'tasks' | 'emails' | 'scraper' | 'automation';

const queues = new Map<QueueName, Bull.Queue>();

function createQueue(name: QueueName): Bull.Queue {
  const queue = new Bull(name, {
    redis: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });

  queue.on('error', (err) => logger.error(`Queue error [${name}]`, { error: err.message }));
  queue.on('failed', (job, err) => logger.warn(`Job failed [${name}:${job.id}]`, { error: err.message }));
  queue.on('completed', (job) => logger.debug(`Job completed [${name}:${job.id}]`));

  return queue;
}

export function getQueue(name: QueueName): Bull.Queue {
  if (!queues.has(name)) {
    queues.set(name, createQueue(name));
  }
  return queues.get(name)!;
}

export async function addJob(
  queueName: QueueName,
  data: Record<string, unknown>,
  opts?: Bull.JobOptions
): Promise<Bull.Job> {
  const queue = getQueue(queueName);
  return queue.add(data, opts);
}

export async function closeAllQueues(): Promise<void> {
  for (const [name, queue] of queues) {
    await queue.close();
    logger.info(`Queue closed: ${name}`);
  }
}

// In-memory fallback (no Redis)
export class InMemoryQueue {
  private jobs: Array<{ id: string; data: unknown; attempts: number; status: string }> = [];
  private handlers: Map<string, (data: unknown) => Promise<void>> = new Map();

  async add(type: string, data: unknown): Promise<string> {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const job = { id, data, attempts: 0, status: 'queued' };
    this.jobs.push(job);

    setImmediate(() => this.process(id, type));
    return id;
  }

  process(id: string, type: string): void {
    const job = this.jobs.find(j => j.id === id);
    if (!job) return;

    const handler = this.handlers.get(type);
    if (!handler) {
      job.status = 'failed';
      return;
    }

    job.status = 'running';
    job.attempts++;

    handler(job.data)
      .then(() => { job.status = 'completed'; })
      .catch(() => {
        if (job.attempts < 3) {
          job.status = 'retrying';
          setTimeout(() => this.process(id, type), 2000 * job.attempts);
        } else {
          job.status = 'failed';
        }
      });
  }

  on(type: string, handler: (data: unknown) => Promise<void>): void {
    this.handlers.set(type, handler);
  }

  getStatus(id: string) {
    return this.jobs.find(j => j.id === id) || null;
  }
}

export const inMemoryQueue = new InMemoryQueue();
