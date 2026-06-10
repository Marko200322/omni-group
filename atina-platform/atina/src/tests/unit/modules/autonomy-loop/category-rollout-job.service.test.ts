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
    expect(svc.getActiveJob()?.id).toBe(job.id);

    await new Promise((r) => setTimeout(r, 50));
    const last = svc.getLastJob();
    expect(last?.status).toBe('completed');
    expect(svc.getActiveJob()).toBeNull();
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
