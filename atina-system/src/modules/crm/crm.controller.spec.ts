import { Test, TestingModule } from '@nestjs/testing';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

describe('CrmController', () => {
  let moduleRef: TestingModule;
  let controller: CrmController;
  let crm: jest.Mocked<
    Pick<CrmService, 'create' | 'findAll' | 'findOne' | 'patch'>
  >;

  beforeEach(async () => {
    crm = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      patch: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      controllers: [CrmController],
      providers: [{ provide: CrmService, useValue: crm }],
    }).compile();

    controller = moduleRef.get(CrmController);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('POST create forwards body to crm.create', async () => {
    const dto = { name: 'A', email: 'a@x.com', status: 'NEW' };
    const saved = { id: 'lead-1', ...dto };
    crm.create.mockResolvedValue(saved as never);

    const result = await controller.create(dto);

    expect(crm.create).toHaveBeenCalledWith(dto);
    expect(result).toBe(saved);
  });

  it('GET findAll proxies to crm.findAll', async () => {
    const rows = [{ id: '1' }];
    crm.findAll.mockResolvedValue(rows as never);

    const result = await controller.findAll();

    expect(crm.findAll).toHaveBeenCalled();
    expect(result).toBe(rows);
  });

  it('GET :id forwards id to crm.findOne', async () => {
    const row = { id: 'lead-2', name: 'X' };
    crm.findOne.mockResolvedValue(row as never);

    const result = await controller.findOne('lead-2');

    expect(crm.findOne).toHaveBeenCalledWith('lead-2');
    expect(result).toBe(row);
  });

  it('PATCH :id forwards id and body to crm.patch', async () => {
    const dto = { status: 'CONTACTED' };
    const updated = { id: 'lead-2', status: 'CONTACTED' };
    crm.patch.mockResolvedValue(updated as never);

    const result = await controller.patch('lead-2', dto);

    expect(crm.patch).toHaveBeenCalledWith('lead-2', dto);
    expect(result).toBe(updated);
  });

  it('PATCH :id forwards userId in body to crm.patch', async () => {
    const dto = {
      userId: '33333333-3333-4333-8333-333333333333',
    };
    const updated = { id: 'lead-3', userId: dto.userId };
    crm.patch.mockResolvedValue(updated as never);

    const result = await controller.patch('lead-3', dto);

    expect(crm.patch).toHaveBeenCalledWith('lead-3', dto);
    expect(result).toBe(updated);
  });
});
