import { AuditLogController } from '../../modules/audit-log/controller/audit-log.controller';

// eslint-disable-next-line no-var
var auditCtlMocks: { record: jest.Mock; list: jest.Mock };

jest.mock('../../modules/audit-log/service/audit-log.service', () => {
  auditCtlMocks = {
    record: jest.fn().mockResolvedValue({ id: 'r1' }),
    list: jest.fn().mockResolvedValue([]),
  };
  return {
    AuditLogService: jest.fn().mockImplementation(() => auditCtlMocks),
  };
});

describe('AuditLogController', () => {
  let controller: AuditLogController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuditLogController();
  });

  it('record passes null actor when req.user is missing', async () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as import('express').Response;

    await controller.record(
      {
        body: {
          eventType: 'system.job',
          entityType: 'Task',
          entityId: 't1',
          severity: 'info',
          payload: {},
        },
      } as import('express').Request,
      res
    );

    expect(auditCtlMocks.record).toHaveBeenCalledWith(
      null,
      'system.job',
      'Task',
      't1',
      'info',
      {}
    );
    expect(status).toHaveBeenCalledWith(201);
  });

  it('list returns rows from service', async () => {
    auditCtlMocks.list.mockResolvedValueOnce([{ id: 'x' }]);
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as import('express').Response;

    await controller.list({} as import('express').Request, res);

    expect(auditCtlMocks.list).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
  });
});
