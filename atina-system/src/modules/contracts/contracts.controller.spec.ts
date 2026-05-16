import { Test, TestingModule } from '@nestjs/testing';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

describe('ContractsController', () => {
  let moduleRef: TestingModule;
  let controller: ContractsController;
  let contracts: jest.Mocked<
    Pick<ContractsService, 'create' | 'findAll' | 'findOne' | 'patch'>
  >;

  beforeEach(async () => {
    contracts = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      patch: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      controllers: [ContractsController],
      providers: [{ provide: ContractsService, useValue: contracts }],
    }).compile();

    controller = moduleRef.get(ContractsController);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('POST create forwards body to contracts.create', async () => {
    const dto = {
      userId: '11111111-1111-1111-1111-111111111111',
      status: 'ACTIVE',
      value: '100',
    };
    const saved = { id: 'contract-1', ...dto };
    contracts.create.mockResolvedValue(saved as never);

    const result = await controller.create(dto);

    expect(contracts.create).toHaveBeenCalledWith(dto);
    expect(result).toBe(saved);
  });

  it('POST create forwards minimal body (userId only)', async () => {
    const dto = { userId: '11111111-1111-1111-1111-111111111111' };
    const saved = { id: 'c2', ...dto, status: 'DRAFT', value: '0' };
    contracts.create.mockResolvedValue(saved as never);

    await controller.create(dto);

    expect(contracts.create).toHaveBeenCalledWith(dto);
  });

  it('GET findAll proxies to contracts.findAll', async () => {
    const rows = [{ id: '1' }];
    contracts.findAll.mockResolvedValue(rows as never);

    const result = await controller.findAll();

    expect(contracts.findAll).toHaveBeenCalled();
    expect(result).toBe(rows);
  });

  it('GET findOne forwards id to contracts.findOne', async () => {
    const id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const row = { id };
    contracts.findOne.mockResolvedValue(row as never);

    const result = await controller.findOne(id);

    expect(contracts.findOne).toHaveBeenCalledWith(id);
    expect(result).toBe(row);
  });

  it('PATCH :id forwards id and body to contracts.patch', async () => {
    const id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    const dto = { status: 'SIGNED', value: '10' };
    const updated = { id, ...dto };
    contracts.patch.mockResolvedValue(updated as never);

    const result = await controller.patch(id, dto);

    expect(contracts.patch).toHaveBeenCalledWith(id, dto);
    expect(result).toBe(updated);
  });
});
