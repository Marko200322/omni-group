import { query } from '../../../database/connection';
import crypto from 'crypto';

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  plan_id: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  email_verification_token: string | null;
  password_reset_token: string | null;
  password_reset_expires: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  plan_slug?: string;
}

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  is_revoked: boolean;
}

export class AuthRepository {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const { rows } = await query<UserRecord>(
      `SELECT u.*, p.slug AS plan_slug
       FROM users u
       LEFT JOIN plans p ON u.plan_id = p.id
       WHERE u.email = $1`,
      [email]
    );
    return rows[0] || null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const { rows } = await query<UserRecord>(
      `SELECT u.*, p.slug AS plan_slug
       FROM users u
       LEFT JOIN plans p ON u.plan_id = p.id
       WHERE u.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    name: string;
    company?: string;
    timezone?: string;
    planId: string | null;
  }): Promise<UserRecord> {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const { rows } = await query<UserRecord>(
      `INSERT INTO users (email, password_hash, name, company, timezone, plan_id, email_verification_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.email, data.passwordHash, data.name, data.company || null, data.timezone || 'UTC', data.planId, verificationToken]
    );
    return rows[0];
  }

  async updateLastLogin(userId: string, ip: string): Promise<void> {
    await query(
      'UPDATE users SET last_login_at = NOW(), last_login_ip = $2 WHERE id = $1',
      [userId, ip]
    );
  }

  async saveRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ip: string;
    userAgent: string;
  }): Promise<void> {
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.userId, data.tokenHash, data.expiresAt, data.ip, data.userAgent]
    );
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const { rows } = await query<RefreshTokenRecord>(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1 AND is_revoked = false AND expires_at > NOW()`,
      [tokenHash]
    );
    return rows[0] || null;
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await query('UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1', [tokenHash]);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await query('UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1', [userId]);
  }

  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await query(
      'UPDATE users SET password_reset_token = $2, password_reset_expires = $3 WHERE id = $1',
      [userId, tokenHash, expiresAt]
    );
  }

  async findUserByResetToken(token: string): Promise<UserRecord | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await query<UserRecord>(
      `SELECT * FROM users
       WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [tokenHash]
    );
    return rows[0] || null;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await query(
      `UPDATE users
       SET password_hash = $2, password_reset_token = NULL, password_reset_expires = NULL
       WHERE id = $1`,
      [userId, passwordHash]
    );
  }

  async verifyEmail(token: string): Promise<UserRecord | null> {
    const { rows } = await query<UserRecord>(
      `UPDATE users
       SET is_email_verified = true, email_verification_token = NULL
       WHERE email_verification_token = $1
       RETURNING *`,
      [token]
    );
    return rows[0] || null;
  }

  async getStarterPlanId(): Promise<string | null> {
    const { rows } = await query<{ id: string }>(
      'SELECT id FROM plans WHERE slug = $1',
      ['starter']
    );
    return rows[0]?.id || null;
  }

  insertBootstrapAudit(userId: string, eventType: string, payloadJson: string) {
    return query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, entity_type, entity_id, severity, payload)
       VALUES ($1, $2, 'user', $1, 'info', $3)`,
      [userId, eventType, payloadJson]
    );
  }
}
