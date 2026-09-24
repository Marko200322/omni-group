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
  active_organization_id?: string | null;
  org_role?: string | null;
}

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  is_revoked: boolean;
}

function isMissingOrgSchema(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  return (
    err.code === '42P01' ||
    err.code === '42703' ||
    /organization_memberships|organizations|active_organization_id/i.test(err.message ?? '')
  );
}

const USER_WITH_ORG_SQL = `SELECT u.*, p.slug AS plan_slug, m.role AS org_role
       FROM users u
       LEFT JOIN plans p ON u.plan_id = p.id
       LEFT JOIN organization_memberships m
         ON m.user_id = u.id
        AND m.organization_id = u.active_organization_id
        AND m.status = 'active'`;

const USER_WITHOUT_ORG_SQL = `SELECT u.*, p.slug AS plan_slug, NULL::text AS org_role
       FROM users u
       LEFT JOIN plans p ON u.plan_id = p.id`;

export class AuthRepository {
  private async findUser(whereSql: string, param: string): Promise<UserRecord | null> {
    try {
      const { rows } = await query<UserRecord>(`${USER_WITH_ORG_SQL} ${whereSql}`, [param]);
      return rows[0] || null;
    } catch (error) {
      if (!isMissingOrgSchema(error)) throw error;
      const { rows } = await query<UserRecord>(`${USER_WITHOUT_ORG_SQL} ${whereSql}`, [param]);
      return rows[0] || null;
    }
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.findUser('WHERE u.email = $1', email);
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.findUser('WHERE u.id = $1', id);
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

  async ensureOrganization(userId: string, name: string): Promise<{ id: string; role: string }> {
    const existing = await query<{ id: string; role: string }>(
      `SELECT o.id, COALESCE(m.role, 'owner') AS role
       FROM users u
       LEFT JOIN organizations o ON o.id = u.active_organization_id
       LEFT JOIN organization_memberships m
         ON m.organization_id = o.id AND m.user_id = u.id AND m.status = 'active'
       WHERE u.id = $1`,
      [userId],
    );
    if (existing.rows[0]?.id) {
      return { id: existing.rows[0].id, role: existing.rows[0].role };
    }

    const slug = `workspace-${userId.replace(/-/g, '')}`;
    const created = await query<{ id: string }>(
      `INSERT INTO organizations (name, slug, owner_user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name.trim() || 'Workspace', slug, userId],
    );
    const organizationId = created.rows[0].id;
    await query(
      `INSERT INTO organization_memberships (organization_id, user_id, role, status, joined_at)
       VALUES ($1, $2, 'owner', 'active', NOW())
       ON CONFLICT (organization_id, user_id) DO NOTHING`,
      [organizationId, userId],
    );
    await query('UPDATE users SET active_organization_id = $1 WHERE id = $2', [organizationId, userId]);
    return { id: organizationId, role: 'owner' };
  }
}
