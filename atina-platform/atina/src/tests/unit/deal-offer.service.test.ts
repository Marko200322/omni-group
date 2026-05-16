import { DealOfferService } from '../../modules/deal-offer/service/deal-offer.service';
import { NotFoundError } from '../../utils/errors';

const mockGetOwned = jest.fn();
const mockCreateRun = jest.fn();
const mockUpdateAfterRun = jest.fn();

jest.mock('../../modules/deal-offer/repository/deal-offer.repository', () => ({
  DealOfferRepository: jest.fn().mockImplementation(() => ({
    getOwned: mockGetOwned,
    createRun: mockCreateRun,
    updateAfterRun: mockUpdateAfterRun,
  })),
}));

describe('DealOfferService', () => {
  let service: DealOfferService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DealOfferService();
    mockGetOwned.mockResolvedValue({ rows: [{ id: 'sys-1' }] });
    mockCreateRun.mockResolvedValue({
      rows: [{ id: 'run-1', output_payload: '{}' }],
    });
    mockUpdateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('run throws NotFoundError when workspace not owned', async () => {
    mockGetOwned.mockResolvedValueOnce({ rows: [] });
    await expect(
      service.run('missing', 'u1', { mode: 'draft', intensity: 25 })
    ).rejects.toThrow(NotFoundError);
    expect(mockCreateRun).not.toHaveBeenCalled();
  });

  it('run uses draft multiplier for estimated revenue', async () => {
    await service.run('sid', 'u1', { mode: 'draft', intensity: 50, revenueEstimate: 100 });
    expect(mockCreateRun).toHaveBeenCalledWith(
      'sid',
      'deal-offer_draft',
      { mode: 'draft', intensity: 50, revenueEstimate: 100 },
      expect.objectContaining({
        estimatedRevenue: 60,
        mode: 'draft',
        intensity: 50,
      })
    );
  });

  it('run uses negotiate multiplier and increments negotiated metrics', async () => {
    await service.run('sid', 'u1', { mode: 'negotiate', intensity: 50, revenueEstimate: 100 });
    expect(mockCreateRun).toHaveBeenCalledWith(
      'sid',
      'deal-offer_negotiate',
      { mode: 'negotiate', intensity: 50, revenueEstimate: 100 },
      expect.objectContaining({ estimatedRevenue: 100 })
    );
    expect(mockUpdateAfterRun).toHaveBeenCalledWith('sid', 100, 'negotiate', 50, 1, 0);
  });

  it('run close mode applies highest multiplier and closed delta', async () => {
    await service.run('sid', 'u1', { mode: 'close', intensity: 50, revenueEstimate: 100 });
    expect(mockCreateRun).toHaveBeenCalledWith(
      'sid',
      'deal-offer_close',
      { mode: 'close', intensity: 50, revenueEstimate: 100 },
      expect.objectContaining({ estimatedRevenue: 145 })
    );
    expect(mockUpdateAfterRun).toHaveBeenCalledWith('sid', 145, 'close', 50, 1, 1);
  });

  it('run floors estimated revenue at 1 for tiny inputs', async () => {
    await service.run('sid', 'u1', { mode: 'draft', intensity: 1, revenueEstimate: 1 });
    expect(mockCreateRun).toHaveBeenCalledWith(
      'sid',
      'deal-offer_draft',
      { mode: 'draft', intensity: 1, revenueEstimate: 1 },
      expect.objectContaining({ estimatedRevenue: 1 })
    );
  });

  it('run omits revenueEstimate from input payload when not provided', async () => {
    await service.run('sid', 'u1', { mode: 'draft', intensity: 50 });
    expect(mockCreateRun).toHaveBeenCalledWith(
      'sid',
      'deal-offer_draft',
      { mode: 'draft', intensity: 50 },
      expect.objectContaining({ estimatedRevenue: 24 })
    );
  });

  it('status returns parsed shape', async () => {
    const s = await service.status();
    expect(s.modes).toEqual(['draft', 'negotiate', 'close']);
    expect(s.activeMode).toBe('draft');
    expect(s.pipeline.maxConcurrentOffers).toBe(200);
  });
});
