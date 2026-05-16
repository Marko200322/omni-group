import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../../database/entities/lead.entity';
import { PatchLeadDto } from './dto/patch-lead.dto';
import { CrmService } from './crm.service';

describe('CrmService', () => {
  let moduleRef: TestingModule;
  let service: CrmService;
  let leadsRepo: jest.Mocked<
    Pick<Repository<Lead>, 'create' | 'save' | 'find' | 'findOne'>
  >;

  beforeEach(async () => {
    leadsRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        CrmService,
        { provide: getRepositoryToken(Lead), useValue: leadsRepo },
      ],
    }).compile();

    service = moduleRef.get(CrmService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('create', () => {
    it('saves lead with defaults when status and userId omitted', async () => {
      const row = {
        name: 'B',
        email: 'b@x.com',
        status: 'NEW',
        userId: null,
      } as Lead;
      leadsRepo.create.mockReturnValue(row);
      leadsRepo.save.mockResolvedValue({ ...row, id: 'uuid-1' } as Lead);

      const result = await service.create({
        name: 'B',
        email: 'b@x.com',
      });

      expect(leadsRepo.create).toHaveBeenCalledWith({
        name: 'B',
        email: 'b@x.com',
        status: 'NEW',
        userId: null,
      });
      expect(leadsRepo.save).toHaveBeenCalledWith(row);
      expect(result).toMatchObject({ id: 'uuid-1' });
    });

    it('passes optional status and userId', async () => {
      const row = {} as Lead;
      leadsRepo.create.mockReturnValue(row);
      leadsRepo.save.mockResolvedValue(row);

      await service.create({
        name: 'C',
        email: 'c@x.com',
        status: 'QUALIFIED',
        userId: 'user-uuid',
      });

      expect(leadsRepo.create).toHaveBeenCalledWith({
        name: 'C',
        email: 'c@x.com',
        status: 'QUALIFIED',
        userId: 'user-uuid',
      });
    });
  });

  describe('findAll', () => {
    it('returns leads ordered by createdAt DESC', async () => {
      const list = [{ id: '1' } as Lead];
      leadsRepo.find.mockResolvedValue(list);

      const result = await service.findAll();

      expect(leadsRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toBe(list);
    });
  });

  describe('findOne', () => {
    it('returns lead when it exists', async () => {
      const row = { id: 'L1', name: 'A' } as Lead;
      leadsRepo.findOne.mockResolvedValue(row);

      const result = await service.findOne('L1');

      expect(leadsRepo.findOne).toHaveBeenCalledWith({ where: { id: 'L1' } });
      expect(result).toBe(row);
    });

    it('throws NotFoundException when lead missing', async () => {
      leadsRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('patch', () => {
    it('merges dto and saves when lead exists', async () => {
      const existing = {
        id: 'L1',
        name: 'Old',
        email: 'old@x.com',
        status: 'NEW',
        userId: null,
        createdAt: new Date(),
      } as Lead;
      leadsRepo.findOne.mockResolvedValue(existing);
      leadsRepo.save.mockImplementation(async (e) => e as Lead);

      const result = await service.patch('L1', { name: 'New' });

      expect(leadsRepo.findOne).toHaveBeenCalledWith({ where: { id: 'L1' } });
      expect(existing.name).toBe('New');
      expect(leadsRepo.save).toHaveBeenCalledWith(existing);
      expect(result).toBe(existing);
    });

    it('does not overwrite fields when dto carries undefined keys', async () => {
      const existing = {
        id: 'L1',
        name: 'Old',
        email: 'keep@x.com',
        status: 'NEW',
        userId: null,
        createdAt: new Date(),
      } as Lead;
      leadsRepo.findOne.mockResolvedValue(existing);
      leadsRepo.save.mockImplementation(async (e) => e as Lead);

      await service.patch('L1', {
        name: 'New',
        email: undefined,
        status: undefined,
      } as PatchLeadDto);

      expect(existing.name).toBe('New');
      expect(existing.email).toBe('keep@x.com');
      expect(existing.status).toBe('NEW');
    });

    it('merges userId when provided', async () => {
      const existing = {
        id: 'L1',
        name: 'Old',
        email: 'old@x.com',
        status: 'NEW',
        userId: null,
        createdAt: new Date(),
      } as Lead;
      leadsRepo.findOne.mockResolvedValue(existing);
      leadsRepo.save.mockImplementation(async (e) => e as Lead);

      await service.patch('L1', {
        userId: '11111111-1111-4111-8111-111111111111',
      });

      expect(existing.userId).toBe('11111111-1111-4111-8111-111111111111');
    });

    it('clears userId when null passed', async () => {
      const existing = {
        id: 'L1',
        name: 'Old',
        email: 'old@x.com',
        status: 'NEW',
        userId: '22222222-2222-4222-8222-222222222222',
        createdAt: new Date(),
      } as Lead;
      leadsRepo.findOne.mockResolvedValue(existing);
      leadsRepo.save.mockImplementation(async (e) => e as Lead);

      await service.patch('L1', { userId: null });

      expect(existing.userId).toBeNull();
    });

    it('throws NotFoundException when lead missing', async () => {
      leadsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.patch('missing', { status: 'LOST' }),
      ).rejects.toThrow(NotFoundException);

      expect(leadsRepo.save).not.toHaveBeenCalled();
    });
  });
});
