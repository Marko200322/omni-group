import { Request, Response } from 'express';
import { GdprController } from '../../modules/gdpr/controller/gdpr.controller';
import { GdprService } from '../../modules/gdpr/service/gdpr.service';

jest.mock('../../modules/gdpr/service/gdpr.service');

const MockGdprService = GdprService as jest.MockedClass<typeof GdprService>;

describe('GdprController', () => {
  let controller: GdprController;
  let mockService: jest.Mocked<GdprService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new GdprController();
    mockService = MockGdprService.mock.instances[0] as jest.Mocked<GdprService>;
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

  it('create forwards userId, requestType, payload and returns 201', async () => {
    const row = { id: 'gdpr-1' };
    mockService.create.mockResolvedValue(row as never);
    const r = res();
    const body = { requestType: 'export', payload: { reason: 'copy' } };
    await controller.create({ ...authed('u55'), body } as Request, r);
    expect(mockService.create).toHaveBeenCalledWith('u55', 'export', { reason: 'copy' });
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: row,
        message: 'GDPR request submitted',
      })
    );
  });

  it('listMine passes userId', async () => {
    mockService.listForUser.mockResolvedValue([{ id: 'a' }] as never);
    const r = res();
    await controller.listMine(authed('u88'), r);
    expect(mockService.listForUser).toHaveBeenCalledWith('u88');
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: [{ id: 'a' }] }));
  });

  it('listAll calls service without user', async () => {
    mockService.listAll.mockResolvedValue([{ id: 'all-1' }] as never);
    const r = res();
    await controller.listAll({} as Request, r);
    expect(mockService.listAll).toHaveBeenCalled();
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: [{ id: 'all-1' }], message: expect.any(String) })
    );
  });

  it('process forwards id, status, response', async () => {
    const row = { id: 'gdpr-2', status: 'completed' };
    mockService.process.mockResolvedValue(row as never);
    const r = res();
    const body = { status: 'completed', response: { note: 'done' } };
    const req = { params: { id: 'req-99' }, body } as unknown as Request;
    await controller.process(req, r);
    expect(mockService.process).toHaveBeenCalledWith('req-99', 'completed', { note: 'done' });
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: row,
        message: 'GDPR request processed',
      })
    );
  });
});
