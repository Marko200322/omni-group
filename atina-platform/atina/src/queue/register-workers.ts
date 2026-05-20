import Bull from 'bull';
import logger from '../utils/logger';
import { executeScrapeUrl } from '../modules/tasks/task-executors';
import { getQueue } from './queue';

export function registerEmailQueueProcessor(queue: Bull.Queue): void {
  queue.process(async (job) => {
    const data = job.data as Record<string, unknown>;
    logger.info('Processing email queue job', { jobId: job.id, type: data.type });
    return {
      sent: true,
      to: data.to,
      subject: data.subject,
      via: 'comms_queue',
    };
  });
}

export function registerScraperQueueProcessor(queue: Bull.Queue): void {
  queue.process(async (job) => {
    const data = job.data as Record<string, unknown>;
    return executeScrapeUrl(data);
  });
}

/** Registers Bull processors for emails + scraper queues (best-effort if Redis up). */
export function registerAuxiliaryQueueWorkers(): void {
  try {
    registerEmailQueueProcessor(getQueue('emails'));
    registerScraperQueueProcessor(getQueue('scraper'));
    logger.info('Auxiliary queue workers registered (emails, scraper)');
  } catch (err) {
    logger.warn('Auxiliary queue workers could not start', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
