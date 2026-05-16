import { Request, Response } from 'express';
import { TitanixController } from '../../modules/titanix/controller/titanix.controller';
import { TitanixService } from '../../modules/titanix/service/titanix.service';

jest.mock('../../modules/titanix/service/titanix.service');

const MockTitanixService = TitanixService as jest.MockedClass<typeof TitanixService>;

describe('TitanixController', () => {
  let controller: TitanixController;
  let mockService: jest.Mocked<TitanixService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TitanixController();
    mockService = MockTitanixService.mock.instances[0] as jest.Mocked<TitanixService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  const authed = (userId = 'u1'): Request =>
    ({
      user: { userId, role: 'user', email: 'a@b.com' },
    }) as Request;

  it('list', async () => {
    mockService.list.mockResolvedValue([{ id: 'w1' }] as never);
    const r = res();
    await controller.list(authed(), r);
    expect(mockService.list).toHaveBeenCalledWith('u1');
    expect(r.json).toHaveBeenCalled();
  });

  it('create', async () => {
    mockService.create.mockResolvedValue({ id: 'new' } as never);
    const r = res();
    await controller.create({ ...authed(), body: { name: 'Wks', budgetAllocated: 5 } } as Request, r);
    expect(mockService.create).toHaveBeenCalledWith('u1', { name: 'Wks', budgetAllocated: 5 });
    expect(r.json).toHaveBeenCalled();
  });

  it('run', async () => {
    mockService.run.mockResolvedValue({ id: 'run1' } as never);
    const r = res();
    await controller.run(
      { ...authed(), params: { id: 'sys-1' }, body: { pipeline: 'content', jobs: 3 } } as unknown as Request,
      r
    );
    expect(mockService.run).toHaveBeenCalledWith('sys-1', 'u1', { pipeline: 'content', jobs: 3 });
    expect(r.json).toHaveBeenCalled();
  });
});
