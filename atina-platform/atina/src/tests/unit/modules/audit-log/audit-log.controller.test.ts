import { Request, Response } from 'express';
import { AuditLogController } from '../../../../modules/audit-log/controller/audit-log.controller';
import { AuditLogService } from '../../../../modules/audit-log/service/audit-log.service';

jest.mock('../../../../modules/audit-log/service/audit-log.service');

const MockAuditLogService = AuditLogService as jest.MockedClass<typeof AuditLogService>;

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let mockService: jest.Mocked<AuditLogService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuditLogController();
    mockService = MockAuditLogService.mock.instances[0] as jest.Mocked<AuditLogService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  it('record passes actor userId and body fields to service', async () => {
    const row = { id: 'ae-1' };
    mockService.record.mockResolvedValue(row as never);
    const r = res();
    const req = {
      user: { userId: 'u99', role: 'user', email: 'a@b.com' },
      body: {
        eventType: 'order.placed',
        entityType: 'Order',
        entityId: 'ord-1',
        severity: 'warn',
        payload: { total: 42 },
      },
    } as Request;

    await controller.record(req, r);

    expect(mockService.record).toHaveBeenCalledWith(
      'u99',
      'order.placed',
      'Order',
      'ord-1',
      'warn',
      { total: 42 }
    );
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('record uses null userId when unauthenticated', async () => {
    mockService.record.mockResolvedValue({ id: 'sys' } as never);
    const r = res();
    await controller.record(
      {
        body: {
          eventType: 'sys.event',
          entityType: 'System',
          entityId: 'e1',
          severity: 'info',
          payload: {},
        },
      } as Request,
      r
    );
    expect(mockService.record).toHaveBeenCalledWith(null, 'sys.event', 'System', 'e1', 'info', {});
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('list returns rows from service', async () => {
    const rows = [{ id: '1' }];
    mockService.list.mockResolvedValue(rows as never);
    const r = res();
    await controller.list({} as Request, r);
    expect(mockService.list).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
  });
});
