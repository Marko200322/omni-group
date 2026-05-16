import { Test, TestingModule } from '@nestjs/testing';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

describe('BillingController', () => {
  let moduleRef: TestingModule;
  let controller: BillingController;
  let billing: jest.Mocked<Pick<BillingService, 'create' | 'findAll' | 'findOne' | 'patch'>>;

  beforeEach(async () => {
    billing = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      patch: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [{ provide: BillingService, useValue: billing }],
    }).compile();

    controller = moduleRef.get(BillingController);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('POST create forwards body to billing.create', async () => {
    const dto = {
      contractId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      amount: '99.99',
    };
    const saved = { id: 'inv-1', ...dto } as never;
    billing.create.mockResolvedValue(saved);

    const result = await controller.create(dto);

    expect(billing.create).toHaveBeenCalledWith(dto);
    expect(result).toBe(saved);
  });

  it('GET findAll returns billing.findAll()', async () => {
    const list = [{ id: 'a' }] as never;
    billing.findAll.mockResolvedValue(list);

    const result = await controller.findAll();

    expect(billing.findAll).toHaveBeenCalled();
    expect(result).toBe(list);
  });

  it('GET findOne forwards id to billing.findOne', async () => {
    const id = '33333333-3333-4333-8333-333333333333';
    const row = { id, amount: '1.00' } as never;
    billing.findOne.mockResolvedValue(row);

    const result = await controller.findOne(id);

    expect(billing.findOne).toHaveBeenCalledWith(id);
    expect(result).toBe(row);
  });

  it('PATCH patch forwards id and body to billing.patch', async () => {
    const id = '66666666-6666-4666-8666-666666666666';
    const dto = { status: 'PAID' as const };
    const updated = { id, ...dto } as never;
    billing.patch.mockResolvedValue(updated);

    const result = await controller.patch(id, dto);

    expect(billing.patch).toHaveBeenCalledWith(id, dto);
    expect(result).toBe(updated);
  });
});
