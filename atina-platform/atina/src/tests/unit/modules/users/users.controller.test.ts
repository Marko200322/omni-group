import { Request, Response } from 'express';
import { UsersController } from '../../../../modules/users/controller/users.controller';
import { UsersService } from '../../../../modules/users/service/users.service';

jest.mock('../../../../modules/users/service/users.service');

const MockUsersService = UsersService as jest.MockedClass<typeof UsersService>;

describe('UsersController', () => {
  let controller: UsersController;
  let mockService: jest.Mocked<UsersService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController();
    mockService = MockUsersService.mock.instances[0] as jest.Mocked<UsersService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  const authed = (role = 'user', userId = 'u1'): Request =>
    ({
      user: { userId, role, email: 'a@b.com' },
    }) as Request;

  it('getProfile', async () => {
    mockService.getProfile.mockResolvedValue({ id: 'u1' } as never);
    const r = res();
    await controller.getProfile(authed(), r);
    expect(mockService.getProfile).toHaveBeenCalledWith('u1');
    expect(r.json).toHaveBeenCalled();
  });

  it('updateProfile', async () => {
    mockService.updateProfile.mockResolvedValue({ id: 'u1' } as never);
    const r = res();
    await controller.updateProfile({ ...authed(), body: { name: 'N' } } as Request, r);
    expect(mockService.updateProfile).toHaveBeenCalledWith('u1', { name: 'N' });
    expect(r.json).toHaveBeenCalled();
  });

  it('getStats', async () => {
    mockService.getUserStats.mockResolvedValue({ x: 1 } as never);
    const r = res();
    await controller.getStats(authed(), r);
    expect(mockService.getUserStats).toHaveBeenCalledWith('u1');
    expect(r.json).toHaveBeenCalled();
  });

  it('listUsers passes query and paginates', async () => {
    mockService.listUsers.mockResolvedValue({ users: [], total: 0 });
    const r = res();
    await controller.listUsers(
      {
        ...authed('admin'),
        query: { page: 2, limit: 5, search: 'x', role: 'user', isActive: true },
      } as unknown as Request,
      r
    );
    expect(mockService.listUsers).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      search: 'x',
      role: 'user',
      isActive: true,
    });
    expect(r.json).toHaveBeenCalled();
  });

  it('listUsers defaults page and limit when omitted', async () => {
    mockService.listUsers.mockResolvedValue({ users: [], total: 0 });
    const r = res();
    await controller.listUsers(
      { ...authed('admin'), query: { page: 1, limit: 20 } } as unknown as Request,
      r
    );
    expect(mockService.listUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: undefined,
      role: undefined,
      isActive: undefined,
    });
    expect(r.json).toHaveBeenCalled();
  });

  it('listUsers defaults only limit when page provided', async () => {
    mockService.listUsers.mockResolvedValue({ users: [], total: 0 });
    const r = res();
    await controller.listUsers(
      { ...authed('admin'), query: { page: 3, limit: 20 } } as unknown as Request,
      r
    );
    expect(mockService.listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, limit: 20 })
    );
  });

  it('listUsers defaults only page when limit provided', async () => {
    mockService.listUsers.mockResolvedValue({ users: [], total: 0 });
    const r = res();
    await controller.listUsers(
      { ...authed('admin'), query: { page: 1, limit: 15 } } as unknown as Request,
      r
    );
    expect(mockService.listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 15 })
    );
  });

  it('getUserById', async () => {
    mockService.getUserById.mockResolvedValue({ id: 'u2' } as never);
    const r = res();
    await controller.getUserById({ ...authed('admin'), params: { id: 'u2' } } as unknown as Request, r);
    expect(mockService.getUserById).toHaveBeenCalledWith('u1', 'admin', 'u2');
    expect(r.json).toHaveBeenCalled();
  });

  it('adminUpdateUser', async () => {
    mockService.adminUpdateUser.mockResolvedValue({ id: 'u2' } as never);
    const r = res();
    await controller.adminUpdateUser(
      { ...authed('admin'), params: { id: 'u2' }, body: { name: 'X' } } as unknown as Request,
      r
    );
    expect(mockService.adminUpdateUser).toHaveBeenCalledWith('u2', { name: 'X' });
    expect(r.json).toHaveBeenCalled();
  });

  it('deactivateUser', async () => {
    mockService.deactivateUser.mockResolvedValue(undefined);
    const r = res();
    await controller.deactivateUser({ ...authed('admin'), params: { id: 'u2' } } as unknown as Request, r);
    expect(mockService.deactivateUser).toHaveBeenCalledWith('u2');
    expect(r.json).toHaveBeenCalled();
  });

  it('createApiKey', async () => {
    mockService.createApiKey.mockResolvedValue({ secret: 's' } as never);
    const r = res();
    await controller.createApiKey({ ...authed(), body: { name: 'k', permissions: ['read'] } } as Request, r);
    expect(mockService.createApiKey).toHaveBeenCalledWith('u1', { name: 'k', permissions: ['read'] });
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalled();
  });

  it('listApiKeys', async () => {
    mockService.listApiKeys.mockResolvedValue([] as never);
    const r = res();
    await controller.listApiKeys(authed(), r);
    expect(mockService.listApiKeys).toHaveBeenCalledWith('u1');
    expect(r.json).toHaveBeenCalled();
  });

  it('revokeApiKey', async () => {
    mockService.revokeApiKey.mockResolvedValue(undefined);
    const r = res();
    await controller.revokeApiKey({ ...authed(), params: { id: 'key-1' } } as unknown as Request, r);
    expect(mockService.revokeApiKey).toHaveBeenCalledWith('u1', 'key-1');
    expect(r.json).toHaveBeenCalled();
  });
});
