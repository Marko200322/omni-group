import { DealOfferService } from '../../../../modules/deal-offer/service/deal-offer.service';

const mockGetOwned = jest.fn();
const mockCreateRun = jest.fn();
const mockUpdateAfterRun = jest.fn();

jest.mock('../../../../integrations', () => ({
  getCommsClient: () => ({ isConfigured: () => false, request: jest.fn() }),
  getAiClient: () => ({ isConfigured: () => false, fetchRecommendations: jest.fn() }),
}));

jest.mock('../../../../modules/deal-offer/repository/deal-offer.repository', () => ({
  DealOfferRepository: jest.fn().mockImplementation(() => ({
    getOwned: mockGetOwned,
    createRun: mockCreateRun,
    updateAfterRun: mockUpdateAfterRun,
  })),
}));

describe('DealOfferService run / status (module-scoped)', () => {
  let service: DealOfferService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DealOfferService();
    mockGetOwned.mockResolvedValue({ rows: [{ id: 'sid' }] });
    mockCreateRun.mockResolvedValue({
      rows: [{ id: 'run-1', output_payload: '{}' }],
    });
    mockUpdateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('run uses default revenue base when revenueEstimate is omitted', async () => {
    await service.run('sid', 'u1', { mode: 'draft', intensity: 50 });
    expect(mockCreateRun).toHaveBeenCalledWith(
      'sid',
      'deal-offer_draft',
      { mode: 'draft', intensity: 50 },
      expect.objectContaining({
        estimatedRevenue: 24,
        winProbability: 60,
      })
    );
  });

  it('run derives winProbability from intensity (max 100 → 85)', async () => {
    await service.run('sid', 'u1', { mode: 'negotiate', intensity: 100, revenueEstimate: 50 });
    expect(mockCreateRun).toHaveBeenCalledWith(
      'sid',
      'deal-offer_negotiate',
      { mode: 'negotiate', intensity: 100, revenueEstimate: 50 },
      expect.objectContaining({ winProbability: 85 })
    );
  });

  it('status returns stable pipeline defaults', async () => {
    const s = await service.status();
    expect(s.pipeline.cooldownSeconds).toBe(20);
    expect(s.modes).toHaveLength(3);
  });
});
