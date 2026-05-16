import { ApexPredatorController } from '../../../../modules/apex-predator/controller/apex-predator.controller';

// eslint-disable-next-line no-var
var apexCtlMocks: { list: jest.Mock; create: jest.Mock; run: jest.Mock; riskGrid: jest.Mock };

jest.mock('../../../../modules/apex-predator/service/apex-predator.service', () => {
  apexCtlMocks = {
    list: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 'c1' }),
    run: jest.fn().mockResolvedValue({ id: 'run1' }),
    riskGrid: jest.fn().mockResolvedValue([]),
  };
  return {
    ApexPredatorService: jest.fn().mockImplementation(() => apexCtlMocks),
  };
});

describe('ApexPredatorController', () => {
  let controller: ApexPredatorController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ApexPredatorController();
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

  it('list passes userId and returns 200', async () => {
    apexCtlMocks.list.mockResolvedValueOnce([{ id: 'p1' }]);
    const r = res();
    await controller.list(authed('u42'), r);
    expect(apexCtlMocks.list).toHaveBeenCalledWith('u42');
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: [{ id: 'p1' }], message: expect.any(String) })
    );
  });

  it('create forwards body and returns 201', async () => {
    const created = { id: 'new-p' };
    apexCtlMocks.create.mockResolvedValueOnce(created);
    const r = res();
    const body = { name: 'Alpha', budgetAllocated: 10, riskProfile: 'low' as const };
    await controller.create({ ...authed(), body } as import('express').Request, r);
    expect(apexCtlMocks.create).toHaveBeenCalledWith('u1', body);
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: created,
        message: 'Apex Predator profile created',
      })
    );
  });

  it('run forwards id, user and body', async () => {
    const runRow = { id: 'r99' };
    apexCtlMocks.run.mockResolvedValueOnce(runRow);
    const r = res();
    const body = { mode: 'upsell' as const, intensity: 55 };
    await controller.run(
      { ...authed('u9'), params: { id: 'sid-1' }, body } as unknown as import('express').Request,
      r
    );
    expect(apexCtlMocks.run).toHaveBeenCalledWith('sid-1', 'u9', body);
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: runRow,
        message: 'Apex Predator cycle completed',
      })
    );
  });

  it('riskGrid returns service rows', async () => {
    const grid = [{ cell: 'a1' }];
    apexCtlMocks.riskGrid.mockResolvedValueOnce(grid);
    const r = res();
    await controller.riskGrid({} as import('express').Request, r);
    expect(apexCtlMocks.riskGrid).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: grid, message: expect.any(String) })
    );
  });
});
