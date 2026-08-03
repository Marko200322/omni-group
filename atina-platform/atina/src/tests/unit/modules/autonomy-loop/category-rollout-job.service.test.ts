import { CategoryRolloutJobService, resetRolloutJobsForTests } from '../../../../modules/autonomy-loop/service/category-rollout-job.service';

jest.mock('../../../../modules/autonomy-loop/service/category-rollout.service', () => ({
  CategoryRolloutService: jest.fn().mockImplementation(() => ({
    processRollout: jest.fn().mockResolvedValue({
      processedCategories: 1,
      totalVerticalsProcessed: 2,
      totalVerticalsSucceeded: 2,
    }),
  })),
}));

jest.mock('../../../../modules/autonomy-loop/repository/autonomy-rollout-job.repository', () => ({
  AutonomyRolloutJobRepository: jest.fn().mockImplementation(() => ({
    insert: jest.fn().mockResolvedValue(undefined),
    markCompleted: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
    getActive: jest.fn().mockResolvedValue(null),
    getLatest: jest.fn().mockResolvedValue(null),
  })),
}));

async function waitForJob(
  svc: CategoryRolloutJobService,
  predicate: (status: string | undefined) => boolean,
  timeoutMs = 2000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const last = await svc.getLastJob();
    if (predicate(last?.status)) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  const last = await svc.getLastJob();
  throw new Error(`Timed out waiting for job status (last=${last?.status ?? 'null'})`);
}

describe('category-rollout-job.service', () => {
  beforeEach(() => {
    resetRolloutJobsForTests();
  });

  it('starts async job and completes', async () => {
    const svc = new CategoryRolloutJobService();
    const job = svc.startJob('user-1', {
      mode: 'full',
      limit: 8,
      maxCategories: 1,
      processAllVerticals: false,
    });
    expect(job.status).toBe('running');
    expect((await svc.getActiveJob())?.id).toBe(job.id);

    await waitForJob(svc, (status) => status === 'completed');
    const last = await svc.getLastJob();
    expect(last?.status).toBe('completed');
    expect(await svc.getActiveJob()).toBeNull();
  });

  it('returns same active job while running', () => {
    const svc = new CategoryRolloutJobService();
    const first = svc.startJob(null, {
      mode: 'full',
      limit: 8,
      maxCategories: 1,
      processAllVerticals: false,
    });
    const second = svc.startJob(null, {
      mode: 'full',
      limit: 8,
      maxCategories: 1,
      processAllVerticals: false,
    });
    expect(second.id).toBe(first.id);
  });
});
