import {
  FREELANCE_CATEGORY_ROLLOUT_ORDER,
  parseRolloutSegment,
  resolveRolloutOrder,
} from '../../../../modules/autonomy-loop/lib/vertical-delivery-profiles';
import { CategoryRolloutService } from '../../../../modules/autonomy-loop/service/category-rollout.service';

jest.mock('../../../../config', () => ({
  config: {
    autonomy: { rolloutSegment: 'all' },
  },
}));

jest.mock('../../../../modules/autonomy-loop/repository/autonomy-loop.repository', () => ({
  AutonomyLoopRepository: jest.fn().mockImplementation(() => ({
    countVerticalsGroupedByCategory: jest.fn().mockResolvedValue({
      rows: [
        { category: 'development_it', status: 'ready', count: '10' },
        { category: 'development_it', status: 'seed', count: '5' },
        { category: 'ai_data', status: 'seed', count: '8' },
      ],
    }),
    countOutboundGroupedByCategory: jest.fn().mockResolvedValue({
      rows: [
        { category: 'development_it', status: 'draft', count: '3' },
        { category: 'ai_data', status: 'draft', count: '1' },
      ],
    }),
    pickVerticalsByCategory: jest.fn().mockResolvedValue({ rows: [] }),
  })),
}));

jest.mock('../../../../modules/autonomy-loop/service/category-batch.service', () => ({
  CategoryBatchService: jest.fn().mockImplementation(() => ({
    processCategory: jest.fn(),
    processCategoryAll: jest.fn(),
  })),
}));

describe('category-rollout.service', () => {
  it('defaults rollout segment to freelance (online poslovi only)', () => {
    expect(parseRolloutSegment(undefined)).toBe('freelance');
    expect(resolveRolloutOrder('freelance')).toHaveLength(25);
  });

  it('builds rollout status with phases and completion', async () => {
    const svc = new CategoryRolloutService();
    const status = await svc.getStatus();

    expect(status.totalCategories).toBe(50);
    expect(status.freelanceCategories).toBe(25);
    expect(status.legacyCategories).toBe(25);
    expect(typeof status.freelanceReadyCount).toBe('number');
    expect(status.categories[0]?.category).toBe('development_it');
    expect(status.categories[0]?.phase).toBe('in_progress');
    expect(status.categories[0]?.completionPct).toBeGreaterThan(0);
    expect(status.categories[1]?.category).toBe('ai_data');
    expect(status.categories[1]?.phase).toBe('pending');
  });

  it('picks next incomplete categories in order', async () => {
    const svc = new CategoryRolloutService();
    const status = await svc.getStatus();
    const next = svc.findNextCategories(status, 2);
    expect(next).toEqual(['development_it', 'ai_data']);
  });
});
