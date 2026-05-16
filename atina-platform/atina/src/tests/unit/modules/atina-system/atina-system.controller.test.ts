import { AtinaSystemController } from '../../../../modules/atina-system/controller/atina-system.controller';

// eslint-disable-next-line no-var
var atinaCtlMocks: { status: jest.Mock; list: jest.Mock; create: jest.Mock; run: jest.Mock };

jest.mock('../../../../modules/atina-system/service/atina-system.service', () => {
  atinaCtlMocks = {
    status: jest.fn().mockResolvedValue({
      providers: ['core', 'cloud', 'partner'],
      nextProvider: 'core',
      capacity: { total: 1000, available: 1000 },
      recentEvents: [],
    }),
    list: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 'w1' }),
    run: jest.fn().mockResolvedValue({ id: 'run1' }),
  };
  return {
    AtinaSystemService: jest.fn().mockImplementation(() => atinaCtlMocks),
  };
});

describe('AtinaSystemController', () => {
  let controller: AtinaSystemController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AtinaSystemController();
  });

  const res = () => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as import('express').Response;
  };

  const authed = (userId = 'u1'): import('express').Request =>
    ({ user: { userId, role: 'user', email: 'a@b.com' } }) as import('express').Request;

  it('status returns service payload', async () => {
    const payload = {
      providers: ['core'] as const,
      nextProvider: 'core' as const,
      capacity: { total: 10, available: 5 },
      recentEvents: [] as Array<{ id: string; eventType: string; createdAt: string }>,
    };
    atinaCtlMocks.status.mockResolvedValueOnce(payload);
    const r = res();
    await controller.status({} as import('express').Request, r);
    expect(atinaCtlMocks.status).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: payload, message: expect.any(String) })
    );
  });

  it('list passes userId from auth', async () => {
    atinaCtlMocks.list.mockResolvedValueOnce([{ id: 'sys-1' }]);
    const r = res();
    await controller.list(authed('u77'), r);
    expect(atinaCtlMocks.list).toHaveBeenCalledWith('u77');
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('create parses body and returns 201', async () => {
    const created = { id: 'new-w' };
    atinaCtlMocks.create.mockResolvedValueOnce(created);
    const r = res();
    const body = { name: 'Workspace', budgetAllocated: 0, operatingMode: 'balanced' as const };
    await controller.create({ ...authed(), body } as import('express').Request, r);
    expect(atinaCtlMocks.create).toHaveBeenCalledWith('u1', body);
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: created,
        message: 'Atina System workspace created',
      })
    );
  });

  it('run forwards id, user and body', async () => {
    const runRow = { id: 'run-x' };
    atinaCtlMocks.run.mockResolvedValueOnce(runRow);
    const r = res();
    const body = { mode: 'sync' as const, intensity: 22 };
    await controller.run(
      { ...authed(), params: { id: 'sid' }, body } as unknown as import('express').Request,
      r
    );
    expect(atinaCtlMocks.run).toHaveBeenCalledWith('sid', 'u1', body);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: runRow,
        message: 'Atina System run completed',
      })
    );
  });
});
