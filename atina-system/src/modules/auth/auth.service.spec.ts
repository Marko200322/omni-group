import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: jest.Mocked<
    Pick<Repository<User>, 'findOne' | 'create' | 'save'>
  >;
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    usersRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('jwt-token') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepo,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      usersRepo.findOne.mockResolvedValue({ id: '1', email: 'a@b.com' } as User);

      await expect(
        service.register({ email: 'a@b.com', password: 'x' }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(usersRepo.save).not.toHaveBeenCalled();
    });

    it('hashes password, saves user, and returns access token shape', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-secret');
      const savedUser = {
        id: 'uuid-1',
        email: 'new@example.com',
        passwordHash: 'hashed-secret',
      } as User;
      usersRepo.create.mockReturnValue(savedUser);
      usersRepo.save.mockResolvedValue(savedUser);

      const result = await service.register({
        email: 'new@example.com',
        password: 'plain',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('plain', 10);
      expect(usersRepo.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        passwordHash: 'hashed-secret',
      });
      expect(usersRepo.save).toHaveBeenCalledWith(savedUser);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'uuid-1',
        email: 'new@example.com',
      });
      expect(result).toEqual({
        access_token: 'jwt-token',
        user: { id: 'uuid-1', email: 'new@example.com' },
      });
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user is not found', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'p' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when password does not match', async () => {
      usersRepo.findOne.mockResolvedValue({
        id: '1',
        email: 'x@y.com',
        passwordHash: 'stored-hash',
      } as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'x@y.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns token and user when credentials are valid', async () => {
      const user = {
        id: 'user-id',
        email: 'ok@example.com',
        passwordHash: 'stored-hash',
      } as User;
      usersRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'ok@example.com',
        password: 'correct',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('correct', 'stored-hash');
      expect(result).toEqual({
        access_token: 'jwt-token',
        user: { id: 'user-id', email: 'ok@example.com' },
      });
    });
  });
});
