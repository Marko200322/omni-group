import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let moduleRef: TestingModule;
  let service: UsersService;
  let repo: jest.Mocked<Pick<Repository<User>, 'findOne'>>;

  beforeEach(async () => {
    repo = { findOne: jest.fn() };

    moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('findById', () => {
    it('returns id, email, createdAt when user exists', async () => {
      const createdAt = new Date('2024-06-01T00:00:00.000Z');
      const row = {
        id: 'uuid-1',
        email: 'x@y.com',
        createdAt,
        passwordHash: 'hashed',
      } as User;
      repo.findOne.mockResolvedValue(row);

      await expect(service.findById('uuid-1')).resolves.toEqual({
        id: 'uuid-1',
        email: 'x@y.com',
        createdAt,
      });
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
    });

    it('throws NotFoundException when user is missing', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
