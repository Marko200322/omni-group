import { UsersRepository } from '../repository/users.repository';
import { NotFoundError, AuthorizationError } from '../../../utils/errors';
import { readProdEnvReadinessSignals } from '../../atina-system/prod-env-readiness';

export class UsersService {
  private repo: UsersRepository;

  constructor() {
    this.repo = new UsersRepository();
  }

  async getProfile(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError('User');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      company: user.company,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      timezone: user.timezone,
      language: user.language,
      isActive: user.is_active,
      isEmailVerified: user.is_email_verified,
      planSlug: user.plan_slug,
      planName: user.plan_name,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      prodEnvReadiness: readProdEnvReadinessSignals(),
    };
  }

  async updateProfile(userId: string, data: Partial<{
    name: string;
    company: string;
    phone: string;
    timezone: string;
    language: string;
    avatarUrl: string;
  }>) {
    const updated = await this.repo.update(userId, data);
    if (!updated) throw new NotFoundError('User');
    return this.getProfile(userId);
  }

  async listUsers(params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }) {
    return this.repo.findAll(params);
  }

  async getUserById(requesterId: string, requesterRole: string, targetId: string) {
    if (requesterId !== targetId && requesterRole !== 'admin') {
      throw new AuthorizationError('Cannot view other users');
    }
    return this.getProfile(targetId);
  }

  async deactivateUser(userId: string) {
    const ok = await this.repo.delete(userId);
    if (!ok) throw new NotFoundError('User');
  }

  async getUserStats(userId: string) {
    return this.repo.getUserStats(userId);
  }

  async createApiKey(userId: string, data: {
    name: string;
    permissions: string[];
    expiresAt?: string;
  }) {
    return this.repo.createApiKey({
      userId,
      name: data.name,
      permissions: data.permissions,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });
  }

  async listApiKeys(userId: string) {
    return this.repo.listApiKeys(userId);
  }

  async revokeApiKey(userId: string, keyId: string) {
    const ok = await this.repo.revokeApiKey(keyId, userId);
    if (!ok) throw new NotFoundError('API Key');
  }

  async adminUpdateUser(userId: string, data: Partial<{
    name: string;
    role: string;
    isActive: boolean;
    planId: string;
  }>) {
    const updated = await this.repo.update(userId, data);
    if (!updated) throw new NotFoundError('User');
    return this.getProfile(userId);
  }
}
