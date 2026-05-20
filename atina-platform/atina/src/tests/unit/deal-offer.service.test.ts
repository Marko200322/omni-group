import { ConflictError, NotFoundError } from '../../utils/errors';
import { DealOfferService } from '../../modules/deal-offer/service/deal-offer.service';
import * as ecosystemIdempotency from '../../utils/ecosystem-idempotency';

const mockRepo = {
  listByUser: jest.fn(),
  create: jest.fn(),
  getOwned: jest.fn(),
  createRun: jest.fn(),
  updateAfterRun: jest.fn(),
};

const mockComms = {
  isConfigured: jest.fn().mockReturnValue(false),
  request: jest.fn().mockResolvedValue(null),
};

const mockAi = {
  isConfigured: jest.fn().mockReturnValue(false),
  fetchRecommendations: jest.fn().mockResolvedValue({ recommendations: ['Offer A'] }),
};

jest.mock('../../modules/deal-offer/repository/deal-offer.repository', () => ({
  DealOfferRepository: jest.fn().mockImplementation(() => mockRepo),
}));

jest.mock('../../integrations', () => ({
  getCommsClient: () => mockComms,
  getAiClient: () => mockAi,
}));

jest.mock('../../utils/ecosystem-idempotency', () => {
  const actual = jest.requireActual<typeof import('../../utils/ecosystem-idempotency')>(
    '../../utils/ecosystem-idempotency'
  );
  return {
    ...actual,
    withEcosystemIdempotencyLock: jest.fn(
      async (_systemId: string, _idempotencyKey: string, work: () => Promise<unknown>) => work()
    ),
    findRecentEcosystemRunByIdempotencyKey: jest.fn(),
  };
});

const mockWithLock = ecosystemIdempotency.withEcosystemIdempotencyLock as jest.MockedFunction<
  typeof ecosystemIdempotency.withEcosystemIdempotencyLock
>;
const mockFindRecent = ecosystemIdempotency.findRecentEcosystemRunByIdempotencyKey as jest.MockedFunction<
  typeof ecosystemIdempotency.findRecentEcosystemRunByIdempotencyKey
>;

describe('DealOfferService', () => {
  let service: DealOfferService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DealOfferService();
    mockRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    mockRepo.create.mockResolvedValue({ rows: [{ id: 'new' }] });
    mockRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sys-1' }] });
    mockRepo.createRun.mockResolvedValue({
      rows: [{ id: 'run-1', output_payload: '{}' }],
    });
    mockRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
    mockFindRecent.mockResolvedValue({ rows: [], rowCount: 0 });
    mockComms.isConfigured.mockReturnValue(false);
    mockAi.isConfigured.mockReturnValue(false);
  });

  it('list and create delegate to repository', async () => {
    const listed = await service.list('u1');
    expect(listed).toEqual([{ id: 'w1' }]);
    const created = await service.create('u1', { name: 'Deal', budgetAllocated: 50, mode: 'draft' });
    expect(created).toEqual({ id: 'new' });
  });

  it('status returns parsed pipeline defaults', async () => {
    const s = await service.status();
    expect(s.pipeline.maxConcurrentOffers).toBe(200);
  });

  it('run throws NotFoundError when workspace not owned', async () => {
    mockRepo.getOwned.mockResolvedValueOnce({ rows: [] });
    await expect(
      service.run('missing', 'u1', { mode: 'draft', intensity: 25 })
    ).rejects.toThrow(NotFoundError);
    expect(mockRepo.createRun).not.toHaveBeenCalled();
  });

  it('run uses draft multiplier for estimated revenue', async () => {
    await service.run('sid', 'u1', { mode: 'draft', intensity: 50, revenueEstimate: 100 });
    expect(mockRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'deal-offer_draft',
      { mode: 'draft', intensity: 50, revenueEstimate: 100 },
      expect.objectContaining({
        estimatedRevenue: 60,
        mode: 'draft',
        intensity: 50,
        comms_dispatched: false,
        ai_recommendations: null,
      })
    );
  });

  it('run dispatches comms on negotiate when configured', async () => {
    mockComms.isConfigured.mockReturnValue(true);
    await service.run('sid', 'u1', { mode: 'negotiate', intensity: 50, revenueEstimate: 100 });
    expect(mockComms.request).toHaveBeenCalledWith('POST', '/v1/deal-offer/notify', expect.any(Object));
    expect(mockRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'deal-offer_negotiate',
      expect.any(Object),
      expect.objectContaining({ comms_dispatched: true })
    );
  });

  it('run fetches AI recommendations on negotiate when configured', async () => {
    mockAi.isConfigured.mockReturnValue(true);
    await service.run('sid', 'u1', { mode: 'negotiate', intensity: 50, revenueEstimate: 100 });
    expect(mockAi.fetchRecommendations).toHaveBeenCalled();
    expect(mockRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'deal-offer_negotiate',
      expect.any(Object),
      expect.objectContaining({ ai_recommendations: ['Offer A'] })
    );
  });

  it('run close mode applies highest multiplier and closed delta', async () => {
    await service.run('sid', 'u1', { mode: 'close', intensity: 50, revenueEstimate: 100 });
    expect(mockRepo.updateAfterRun).toHaveBeenCalledWith('sid', 145, 'close', 50, 1, 1);
  });

  it('run close dispatches comms when configured', async () => {
    mockComms.isConfigured.mockReturnValue(true);
    await service.run('sid', 'u1', { mode: 'close', intensity: 50, revenueEstimate: 100 });
    expect(mockComms.request).toHaveBeenCalled();
    expect(mockRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'deal-offer_close',
      expect.any(Object),
      expect.objectContaining({ comms_dispatched: true })
    );
  });

  it('run without idempotency key creates run directly', async () => {
    await service.run('sid', 'u1', { mode: 'draft', intensity: 10 });
    expect(mockWithLock).not.toHaveBeenCalled();
    expect(mockRepo.createRun).toHaveBeenCalled();
  });

  describe('run idempotency', () => {
    const dto = { mode: 'negotiate' as const, intensity: 50, revenueEstimate: 100 };

    it('returns existing run when idempotency key matches', async () => {
      const existing = {
        id: 'prior',
        output_payload: {
          mode: 'negotiate',
          intensity: 50,
          estimatedRevenue: 100,
          idempotency_key: 'idem-1',
        },
      };
      mockFindRecent.mockResolvedValueOnce({ rows: [existing], rowCount: 1 });

      const result = await service.run('sys-1', 'u1', dto, 'idem-1');

      expect(mockWithLock).toHaveBeenCalledWith('sys-1', 'idem-1', expect.any(Function));
      expect(result).toBe(existing);
      expect(mockRepo.createRun).not.toHaveBeenCalled();
    });

    it('throws ConflictError when prior payload differs', async () => {
      mockFindRecent.mockResolvedValueOnce({
        rows: [{ id: 'prior', output_payload: { mode: 'close', intensity: 50, estimatedRevenue: 145 } }],
        rowCount: 1,
      });

      await expect(service.run('sys-1', 'u1', dto, 'idem-1')).rejects.toBeInstanceOf(ConflictError);
    });

    it('throws ConflictError when prior estimatedRevenue differs', async () => {
      mockFindRecent.mockResolvedValueOnce({
        rows: [
          {
            id: 'prior',
            output_payload: { mode: 'negotiate', intensity: 50, estimatedRevenue: 999 },
          },
        ],
        rowCount: 1,
      });

      await expect(service.run('sys-1', 'u1', dto, 'idem-1')).rejects.toBeInstanceOf(ConflictError);
    });
  });
});
