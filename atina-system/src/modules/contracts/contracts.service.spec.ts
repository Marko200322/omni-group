import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../../database/entities/contract.entity';
import { ContractsService } from './contracts.service';

describe('ContractsService', () => {
  let moduleRef: TestingModule;
  let service: ContractsService;
  let repo: jest.Mocked<
    Pick<Repository<Contract>, 'create' | 'save' | 'find' | 'findOne'>
  >;

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: getRepositoryToken(Contract), useValue: repo },
      ],
    }).compile();

    service = moduleRef.get(ContractsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('create', () => {
    it('saves contract with DRAFT and 0 when status and value omitted', async () => {
      const userId = '22222222-2222-2222-2222-222222222222';
      const row = {
        userId,
        status: 'DRAFT',
        value: '0',
      } as Contract;
      repo.create.mockReturnValue(row);
      repo.save.mockResolvedValue({ ...row, id: 'uuid-1' } as Contract);

      const result = await service.create({ userId });

      expect(repo.create).toHaveBeenCalledWith({
        userId,
        status: 'DRAFT',
        value: '0',
      });
      expect(repo.save).toHaveBeenCalledWith(row);
      expect(result).toMatchObject({ id: 'uuid-1' });
    });

    it('passes optional status and value', async () => {
      const userId = '33333333-3333-3333-3333-333333333333';
      const row = {} as Contract;
      repo.create.mockReturnValue(row);
      repo.save.mockResolvedValue(row);

      await service.create({
        userId,
        status: 'SIGNED',
        value: '99.50',
      });

      expect(repo.create).toHaveBeenCalledWith({
        userId,
        status: 'SIGNED',
        value: '99.50',
      });
    });
  });

  describe('findAll', () => {
    it('returns contracts ordered by createdAt DESC with user relation', async () => {
      const list = [{ id: '1' } as Contract];
      repo.find.mockResolvedValue(list);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        relations: ['user'],
      });
      expect(result).toBe(list);
    });
  });

  describe('findOne', () => {
    it('returns contract with user relation when found', async () => {
      const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const row = { id, userId: 'u1' } as Contract;
      repo.findOne.mockResolvedValue(row);

      const result = await service.findOne(id);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['user'],
      });
      expect(result).toBe(row);
    });

    it('throws NotFoundException when missing', async () => {
      const id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toMatchObject({
        response: { message: 'Ugovor nije pronađen', statusCode: 404 },
      });
    });
  });

  describe('patch', () => {
    it('merges partial fields and saves', async () => {
      const id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
      const existing = {
        id,
        userId: '22222222-2222-2222-2222-222222222222',
        status: 'DRAFT',
        value: '0',
      } as Contract;
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (e) => e as Contract);

      const result = await service.patch(id, { status: 'ACTIVE', value: '5' });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(existing.status).toBe('ACTIVE');
      expect(existing.value).toBe('5');
      expect(repo.save).toHaveBeenCalledWith(existing);
      expect(result).toBe(existing);
    });

    it('throws NotFoundException when contract missing', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.patch('ffffffff-ffff-ffff-ffff-ffffffffffff', {
          status: 'SIGNED',
        }),
      ).rejects.toMatchObject({
        response: { message: 'Ugovor nije pronađen', statusCode: 404 },
      });

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('allows patch with empty dto (no-op merge)', async () => {
      const id = '99999999-9999-9999-9999-999999999999';
      const existing = {
        id,
        userId: '22222222-2222-2222-2222-222222222222',
        status: 'DRAFT',
        value: '0',
      } as Contract;
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (e) => e as Contract);

      const result = await service.patch(id, {});

      expect(repo.save).toHaveBeenCalledWith(existing);
      expect(result).toBe(existing);
    });
  });
});
