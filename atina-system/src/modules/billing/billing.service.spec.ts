import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../../database/entities/invoice.entity';
import { BillingService } from './billing.service';

describe('BillingService', () => {
  let service: BillingService;
  let repo: jest.Mocked<
    Pick<Repository<Invoice>, 'create' | 'save' | 'find' | 'findOne'>
  >;

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: getRepositoryToken(Invoice),
          useValue: repo,
        },
      ],
    }).compile();

    service = moduleRef.get(BillingService);
  });

  describe('create', () => {
    it('creates row with PENDING when status omitted and saves', async () => {
      const created = {
        contractId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        amount: '100.00',
        status: 'PENDING',
      } as Invoice;
      const saved = { ...created, id: 'inv-1' } as Invoice;
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(saved);

      const result = await service.create({
        contractId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        amount: '100.00',
      });

      expect(repo.create).toHaveBeenCalledWith({
        contractId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        amount: '100.00',
        status: 'PENDING',
      });
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(saved);
    });

    it('uses provided status', async () => {
      const created = {
        contractId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        amount: '50.00',
        status: 'PAID',
      } as Invoice;
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      await service.create({
        contractId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        amount: '50.00',
        status: 'PAID',
      });

      expect(repo.create).toHaveBeenCalledWith({
        contractId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        amount: '50.00',
        status: 'PAID',
      });
    });
  });

  describe('findAll', () => {
    it('returns invoices ordered by createdAt desc with contract relation', async () => {
      const rows = [{ id: '1' } as Invoice];
      repo.find.mockResolvedValue(rows);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        relations: ['contract'],
      });
      expect(result).toBe(rows);
    });
  });

  describe('findOne', () => {
    it('returns invoice with contract when found', async () => {
      const id = '11111111-1111-4111-8111-111111111111';
      const row = { id, contractId: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee' } as Invoice;
      repo.findOne.mockResolvedValue(row);

      const result = await service.findOne(id);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['contract'],
      });
      expect(result).toBe(row);
    });

    it('throws NotFoundException when missing', async () => {
      const id = '22222222-2222-4222-8222-222222222222';
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('patch', () => {
    it('applies partial fields and saves', async () => {
      const id = '44444444-4444-4444-8444-444444444444';
      const existing = {
        id,
        contractId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        amount: '10.00',
        status: 'PENDING',
      } as Invoice;
      const updated = { ...existing, status: 'PAID' } as Invoice;
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue(updated);

      const result = await service.patch(id, { status: 'PAID' });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(existing.status).toBe('PAID');
      expect(repo.save).toHaveBeenCalledWith(existing);
      expect(result).toBe(updated);
    });

    it('throws NotFoundException when missing', async () => {
      const id = '55555555-5555-4555-8555-555555555555';
      repo.findOne.mockResolvedValue(null);

      await expect(service.patch(id, { amount: '1.00' })).rejects.toThrow(NotFoundException);
    });
  });
});
