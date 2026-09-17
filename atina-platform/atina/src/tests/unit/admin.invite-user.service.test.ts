import { AdminService } from '../../modules/admin/service/admin.service';
import { AuthService } from '../../modules/auth/service/auth.service';

const registerMock = jest.fn();
const sendEmailMock = jest.fn();

jest.mock('../../modules/auth/service/auth.service', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    register: registerMock,
  })),
}));

jest.mock('../../modules/notifications/service/notifications.service', () => ({
  NotificationsService: jest.fn().mockImplementation(() => ({
    sendEmail: sendEmailMock,
  })),
}));

describe('AdminService.inviteUser', () => {
  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService();
    registerMock.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: '15m',
      user: {
        id: 'user-1',
        email: 'client@test.com',
        name: 'Client',
        role: 'user',
        planSlug: 'starter',
        isEmailVerified: false,
      },
    });
    jest.spyOn(service['repo'], 'updateUser').mockResolvedValue({ rows: [{}], rowCount: 1 } as never);
    jest.spyOn(service['repo'], 'getPlanIdBySlug').mockResolvedValue({
      rows: [{ id: 'plan-pro', slug: 'pro' }],
      rowCount: 1,
    } as never);
    jest.spyOn(service['repo'], 'insertAuditEvent').mockResolvedValue({ rows: [], rowCount: 1 } as never);
  });

  it('creates client with generated temporary password', async () => {
    const result = await service.inviteUser('admin-1', {
      name: 'Client',
      email: 'client@test.com',
      timezone: 'UTC',
      sendWelcomeEmail: false,
    });

    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'client@test.com',
        name: 'Client',
      })
    );
    expect(result.data.temporaryPassword).toEqual(expect.any(String));
    expect(result.data.email).toBe('client@test.com');
  });

  it('does not return password when admin supplied one', async () => {
    const result = await service.inviteUser('admin-1', {
      name: 'Client',
      email: 'client@test.com',
      password: 'CustomPass1',
      timezone: 'UTC',
      sendWelcomeEmail: false,
    });

    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'CustomPass1' })
    );
    expect(result.data.temporaryPassword).toBeNull();
  });

  it('sends welcome email when requested', async () => {
    await service.inviteUser('admin-1', {
      name: 'Client',
      email: 'client@test.com',
      timezone: 'UTC',
      sendWelcomeEmail: true,
    });

    expect(sendEmailMock).toHaveBeenCalledWith(
      'client@test.com',
      'Your Omni Group portal access is ready',
      expect.stringContaining('/login'),
      expect.stringContaining('Temporary password:')
    );
  });
});
