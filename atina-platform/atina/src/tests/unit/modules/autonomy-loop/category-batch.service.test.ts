import { CategoryBatchService } from '../../../../modules/autonomy-loop/service/category-batch.service';

const pickVerticalsByCategory = jest.fn();
const countVerticals = jest.fn();

jest.mock('../../../../modules/autonomy-loop/repository/autonomy-loop.repository', () => ({
  AutonomyLoopRepository: jest.fn().mockImplementation(() => ({
    pickVerticalsByCategory,
    countVerticals,
  })),
}));

jest.mock('../../../../modules/autonomy-loop/service/market-research.service', () => ({
  MarketResearchService: jest.fn().mockImplementation(() => ({
    research: jest.fn().mockResolvedValue({ research: { tam_estimate_usd: 1000 } }),
  })),
}));

jest.mock('../../../../modules/autonomy-loop/service/module-generator.service', () => ({
  ModuleGeneratorService: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockResolvedValue({ artifacts: [{}], outboundDraft: { id: 'd1', status: 'draft' } }),
  })),
}));

describe('category-batch.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    countVerticals.mockResolvedValue({ rows: [{ count: '3' }] });
  });

  it('processCategoryAll always queries from offset 0 until no pending rows', async () => {
    const offsets: number[] = [];
    pickVerticalsByCategory.mockImplementation(
      (_cat: string, _limit: number, offset: number) => {
        offsets.push(offset);
        if (offsets.length === 1) {
          return {
            rows: [
              { slug: 'a', status: 'seed' },
              { slug: 'b', status: 'seed' },
            ],
          };
        }
        if (offsets.length === 2) {
          return { rows: [{ slug: 'c', status: 'seed' }] };
        }
        return { rows: [] };
      }
    );

    const svc = new CategoryBatchService();
    const result = await svc.processCategoryAll(null, 'logistics', 'full', 2);

    expect(result.processed).toBe(3);
    expect(result.succeeded).toBe(3);
    expect(result.pages).toBe(3);
    expect(offsets).toEqual([0, 0, 0]);
  });
});
