import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../../config';
import { AuthRepository } from '../repository/auth.repository';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../utils/errors';
import { JwtPayload } from '../../../api/middleware/auth.middleware';
import logger from '../../../utils/logger';
import type { AuthPostLoginBootstrap } from './auth-post-login-bootstrap';

export interface AuthServiceDeps {
  repo?: AuthRepository;
  postLoginBootstrap: AuthPostLoginBootstrap;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginResult extends AuthTokens {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    planSlug: string | null;
    isEmailVerified: boolean;
  };
}

export class AuthService {
  private repo: AuthRepository;
  private readonly postLoginBootstrap: AuthPostLoginBootstrap;

  constructor(deps: AuthServiceDeps) {
    this.repo = deps.repo ?? new AuthRepository();
    this.postLoginBootstrap = deps.postLoginBootstrap;
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
    company?: string;
    timezone?: string;
  }): Promise<LoginResult> {
    const emailNorm = data.email.toLowerCase().trim();
    const existing = await this.repo.findUserByEmail(emailNorm);
    if (existing) {
      throw new ConflictError('Email address is already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const planId = await this.repo.getStarterPlanId();

    const user = await this.repo.createUser({
      email: emailNorm,
      passwordHash,
      name: data.name.trim(),
      company: data.company,
      timezone: data.timezone,
      planId,
    });

    logger.info('New user registered', { userId: user.id, email: user.email });

    const tokens = this.generateTokens({ userId: user.id, email: user.email, role: user.role });

    await this.repo.saveRefreshToken({
      userId: user.id,
      tokenHash: this.hashToken(tokens.refreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ip: '',
      userAgent: '',
    });

    // Best-effort onboarding: create default workflow templates for new tenants.
    try {
      const report = await this.postLoginBootstrap.bootstrapTemplates(user.id, false);
      await this.logBootstrapAudit(user.id, 'auth_register_bootstrap', report);
    } catch (error) {
      logger.warn('Workflow template bootstrap failed after register', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'unknown',
      });
      await this.logBootstrapAudit(user.id, 'auth_register_bootstrap_failed', {
        error: error instanceof Error ? error.message : 'unknown',
      });
    }

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        planSlug: 'starter',
        isEmailVerified: false,
      },
    };
  }

  async login(
    email: string,
    password: string,
    ip = '',
    userAgent = '',
    rememberMe = false
  ): Promise<LoginResult> {
    const user = await this.repo.findUserByEmail(email.toLowerCase().trim());

    if (!user || !user.is_active) {
      throw new AuthenticationError('Invalid email or password');
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      throw new AuthenticationError('Invalid email or password');
    }

    const isFirstLogin = !user.last_login_at;
    await this.repo.updateLastLogin(user.id, ip);

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      planSlug: user.plan_slug,
    };

    const tokens = this.generateTokens(payload, rememberMe);

    const refreshExpiresAt = rememberMe
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.repo.saveRefreshToken({
      userId: user.id,
      tokenHash: this.hashToken(tokens.refreshToken),
      expiresAt: refreshExpiresAt,
      ip,
      userAgent,
    });

    if (isFirstLogin) {
      try {
        const report = await this.postLoginBootstrap.bootstrapTemplates(user.id, false);
        await this.logBootstrapAudit(user.id, 'auth_first_login_bootstrap', report);
      } catch (error) {
        logger.warn('Workflow template bootstrap failed after first login', {
          userId: user.id,
          error: error instanceof Error ? error.message : 'unknown',
        });
        await this.logBootstrapAudit(user.id, 'auth_first_login_bootstrap_failed', {
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    logger.info('User logged in', { userId: user.id });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        planSlug: user.plan_slug || null,
        isEmailVerified: user.is_email_verified,
      },
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);
    const record = await this.repo.findRefreshToken(tokenHash);

    if (!record) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    const user = await this.repo.findUserById(record.user_id);
    if (!user || !user.is_active) {
      // Same message as missing token to avoid leaking account state via refresh flow.
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    // Rotate token
    await this.repo.revokeRefreshToken(tokenHash);

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      planSlug: user.plan_slug,
    };

    const tokens = this.generateTokens(payload);

    await this.repo.saveRefreshToken({
      userId: user.id,
      tokenHash: this.hashToken(tokens.refreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ip: '',
      userAgent: '',
    });

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.repo.revokeRefreshToken(tokenHash);
  }

  async forgotPassword(email: string): Promise<string> {
    const emailNorm = email.toLowerCase().trim();
    const user = await this.repo.findUserByEmail(emailNorm);
    if (!user) {
      // Don't reveal whether email exists
      return 'If this email exists, a reset link was sent';
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.repo.setPasswordResetToken(user.id, token, expiresAt);
    logger.info('Password reset requested', { userId: user.id });

    // In production, send email here
    return token; // Return for development; in prod only send email
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.repo.findUserByResetToken(token);
    if (!user) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.repo.updatePassword(user.id, passwordHash);
    await this.repo.revokeAllUserTokens(user.id);

    logger.info('Password reset completed', { userId: user.id });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new NotFoundError('User');

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) throw new ValidationError('Current password is incorrect');

    if (currentPassword === newPassword) {
      throw new ValidationError('New password must differ from current password');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.repo.updatePassword(userId, passwordHash);
    await this.repo.revokeAllUserTokens(userId);
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.repo.verifyEmail(token);
    if (!user) throw new AuthenticationError('Invalid verification token');
    logger.info('Email verified', { userId: user.id });
  }

  async getMe(userId: string) {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new NotFoundError('User');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      planSlug: user.plan_slug || null,
      isEmailVerified: user.is_email_verified,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    };
  }

  private generateTokens(payload: JwtPayload, rememberMe = false): AuthTokens {
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwt.sign(
      { userId: payload.userId },
      config.jwt.refreshSecret,
      { expiresIn: rememberMe ? '90d' : (config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn']) }
    );

    return { accessToken, refreshToken, expiresIn: config.jwt.expiresIn };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async logBootstrapAudit(userId: string, eventType: string, payload: Record<string, unknown>) {
    try {
      await this.repo.insertBootstrapAudit(userId, eventType, JSON.stringify(payload));
    } catch (error) {
      logger.warn('Failed to write bootstrap audit', {
        userId,
        eventType,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }
}
