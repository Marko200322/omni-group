import * as queue from '../../../queue/queue';
import {
  registerAuxiliaryQueueWorkers,
  registerAutomationQueueProcessor,
  registerEmailQueueProcessor,
  registerScraperQueueProcessor,
} from '../../../queue/register-workers';

jest.mock('../../../queue/queue');
jest.mock('../../../modules/tasks/task-executors', () => ({
  executeScrapeUrl: jest.fn().mockResolvedValue({ status: 'scraped', url: 'https://x.com' }),
}));
const mockProcessAutomation = jest.fn().mockResolvedValue({ completed: true });
jest.mock('../../../modules/automation/service/automation-scheduled-task.processor', () => ({
  AutomationScheduledTaskProcessor: jest.fn().mockImplementation(() => ({
    process: mockProcessAutomation,
  })),
}));

const mockGetQueue = queue.getQueue as jest.MockedFunction<typeof queue.getQueue>;

describe('register-workers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registerEmailQueueProcessor returns sent payload', async () => {
    const handler = jest.fn();
    const process = (fn: typeof handler) => {
      handler.mockImplementation(fn);
    };
    registerEmailQueueProcessor({ process } as never);
    const result = await handler({ id: 'j1', data: { type: 'welcome', to: 'a@b.com', subject: 'Hi' } });
    expect(result).toMatchObject({ sent: true, to: 'a@b.com', via: 'comms_queue' });
  });

  it('registerScraperQueueProcessor delegates to executeScrapeUrl', async () => {
    const handler = jest.fn();
    const process = (fn: typeof handler) => {
      handler.mockImplementation(fn);
    };
    registerScraperQueueProcessor({ process } as never);
    await handler({ id: 'j2', data: { url: 'https://x.com' } });
    const { executeScrapeUrl } = jest.requireMock('../../../modules/tasks/task-executors');
    expect(executeScrapeUrl).toHaveBeenCalledWith({ url: 'https://x.com' });
  });

  it('registerAutomationQueueProcessor delegates scheduled jobs', async () => {
    const handler = jest.fn();
    const process = (fn: typeof handler) => {
      handler.mockImplementation(fn);
    };
    registerAutomationQueueProcessor({ process } as never);
    await handler({ id: 'j3', data: { taskId: 'task-1', workflowId: 'workflow-1' } });
    expect(mockProcessAutomation).toHaveBeenCalledWith({
      taskId: 'task-1',
      workflowId: 'workflow-1',
    });
  });

  it('registerAuxiliaryQueueWorkers registers emails, scraper, and automation queues', () => {
    const process = jest.fn();
    mockGetQueue.mockReturnValue({ process } as never);
    registerAuxiliaryQueueWorkers();
    expect(mockGetQueue).toHaveBeenCalledWith('emails');
    expect(mockGetQueue).toHaveBeenCalledWith('scraper');
    expect(mockGetQueue).toHaveBeenCalledWith('automation');
    expect(process).toHaveBeenCalledTimes(3);
  });

  it('registerAuxiliaryQueueWorkers swallows queue errors', () => {
    mockGetQueue.mockImplementation(() => {
      throw new Error('no redis');
    });
    expect(() => registerAuxiliaryQueueWorkers()).not.toThrow();
  });

  it('registerAuxiliaryQueueWorkers logs warn on non-Error throw', () => {
    mockGetQueue.mockImplementation(() => {
      throw 'redis-down';
    });
    expect(() => registerAuxiliaryQueueWorkers()).not.toThrow();
  });
});
