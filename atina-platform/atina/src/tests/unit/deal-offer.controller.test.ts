import { Request, Response } from 'express';
import { DealOfferController } from '../../modules/deal-offer/controller/deal-offer.controller';
import { DealOfferService } from '../../modules/deal-offer/service/deal-offer.service';

jest.mock('../../modules/deal-offer/service/deal-offer.service');

const MockDealOfferService = DealOfferService as jest.MockedClass<typeof DealOfferService>;

describe('DealOfferController', () => {
  let controller: DealOfferController;
  let mockService: jest.Mocked<DealOfferService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DealOfferController();
    mockService = MockDealOfferService.mock.instances[0] as jest.Mocked<DealOfferService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  const authed = (userId = 'u1'): Request =>
    ({ user: { userId, role: 'user', email: 'a@b.com' } }) as Request;

  it('status returns service payload via sendSuccess', async () => {
    const payload = {
      modes: ['draft', 'negotiate', 'close'] as const,
      activeMode: 'draft' as const,
      pipeline: { maxConcurrentOffers: 200, cooldownSeconds: 20 },
    };
    mockService.status.mockResolvedValue(payload as never);
    const r = res();
    await controller.status({} as Request, r);
    expect(mockService.status).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: payload, message: expect.any(String) })
    );
  });

  it('list passes userId from auth', async () => {
    mockService.list.mockResolvedValue([{ id: 'w1' }] as never);
    const r = res();
    await controller.list(authed('u42'), r);
    expect(mockService.list).toHaveBeenCalledWith('u42');
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalled();
  });

  it('create parses body and returns 201', async () => {
    const created = { id: 'new-do' };
    mockService.create.mockResolvedValue(created as never);
    const r = res();
    const body = { name: 'My Offer', budgetAllocated: 10, mode: 'negotiate' as const };
    await controller.create({ ...authed(), body } as Request, r);
    expect(mockService.create).toHaveBeenCalledWith('u1', body);
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: created,
        message: 'Deal Offer workspace created',
      })
    );
  });

  it('run forwards id, user and body', async () => {
    const runRow = { id: 'run-do-1' };
    mockService.run.mockResolvedValue(runRow as never);
    const r = res();
    const body = { mode: 'close' as const, intensity: 80 };
    const req = {
      ...authed('u9'),
      params: { id: 'sys-do-1' },
      body,
      header: jest.fn().mockReturnValue(undefined),
    } as unknown as Request;
    await controller.run(req, r);
    expect(mockService.run).toHaveBeenCalledWith('sys-do-1', 'u9', body, undefined);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: runRow, message: 'Deal Offer run completed' })
    );
    expect(r.status).toHaveBeenCalledWith(200);
  });
});
