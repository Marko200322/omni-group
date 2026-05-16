import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let moduleRef: TestingModule;
  let controller: UsersController;
  let users: jest.Mocked<Pick<UsersService, 'findById'>>;

  beforeEach(async () => {
    users = { findById: jest.fn() };

    moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: users }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(UsersController);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('GET users/me delegates to UsersService.findById with JWT subject', async () => {
    const createdAt = new Date('2025-01-02T00:00:00.000Z');
    const payload = { id: 'u1', email: 'a@b.com', createdAt };
    users.findById.mockResolvedValue(payload);

    const req = { user: { userId: 'u1', email: 'a@b.com' } };
    await expect(controller.me(req as never)).resolves.toEqual(payload);

    expect(users.findById).toHaveBeenCalledWith('u1');
  });
});
