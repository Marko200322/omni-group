import { query } from '../../../database/connection';
import crypto from 'crypto';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  company: string | null;
  phone: string | null;
  avatar_url: string | null;
  timezone: string;
  language: string;
  is_active: boolean;
  is_email_verified: boolean;
  plan_id: string | null;
  plan_slug: string | null;
  plan_name: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  last_used_at: Date | null;
  expires_at: Date | null;
  is_active: boolean;
  created_at: Date;
}

export class UsersRepository {
  async findById(id: string): Promise<UserProfile | null> {
    const { rows } = await query<UserProfile>(
      `SELECT u.*, p.slug AS plan_slug, p.name AS plan_name
       FROM users u
       LEFT JOIN plans p ON u.plan_id = p.id
       WHERE u.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<{ users: UserProfile[]; total: number }> {
    const offset = (params.page - 1) * params.limit;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.search) {
      conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
      values.push(`%${params.search}%`);
      idx++;
    }
    if (params.role) {
      conditions.push(`u.role = $${idx++}`);
      values.push(params.role);
    }
    if (params.isActive !== undefined) {
      conditions.push(`u.is_active = $${idx++}`);
      values.push(params.isActive);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM users u ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const { rows } = await query<UserProfile>(
      `SELECT u.*, p.slug AS plan_slug, p.name AS plan_name
       FROM users u
       LEFT JOIN plans p ON u.plan_id = p.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, params.limit, offset]
    );

    return { users: rows, total };
  }

  async update(id: string, data: Partial<{
    name: string;
    company: string;
    phone: string;
    timezone: string;
    language: string;
    avatarUrl: string;
    isActive: boolean;
    role: string;
    planId: string;
  }>): Promise<UserProfile | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      company: 'company',
      phone: 'phone',
      timezone: 'timezone',
      language: 'language',
      avatarUrl: 'avatar_url',
      isActive: 'is_active',
      role: 'role',
      planId: 'plan_id',
    };

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${idx++}`);
        values.push(value);
      }
    }

    if (!fields.length) return this.findById(id);

    values.push(id);
    const { rows } = await query<UserProfile>(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx}
       RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query('UPDATE users SET is_active = false WHERE id = $1', [id]);
    return rowCount > 0;
  }

  // API Keys
  async createApiKey(data: {
    userId: string;
    name: string;
    permissions: string[];
    expiresAt?: Date;
  }): Promise<{ record: ApiKeyRecord; rawKey: string }> {
    const rawKey = `atina_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 12);

    const { rows } = await query<ApiKeyRecord>(
      `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, permissions, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, name, key_prefix, permissions, last_used_at, expires_at, is_active, created_at`,
      [data.userId, data.name, keyHash, keyPrefix, JSON.stringify(data.permissions), data.expiresAt || null]
    );

    return { record: rows[0], rawKey };
  }

  async listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
    const { rows } = await query<ApiKeyRecord>(
      `SELECT id, user_id, name, key_prefix, permissions, last_used_at, expires_at, is_active, created_at
       FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  async revokeApiKey(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await query(
      'UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rowCount > 0;
  }

  async getUserStats(userId: string): Promise<Record<string, number>> {
    const [tasks, notifications, apiKeys] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) FROM tasks WHERE user_id = $1', [userId]),
      query<{ count: string }>('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false', [userId]),
      query<{ count: string }>('SELECT COUNT(*) FROM api_keys WHERE user_id = $1 AND is_active = true', [userId]),
    ]);

    return {
      totalTasks: parseInt(tasks.rows[0].count, 10),
      unreadNotifications: parseInt(notifications.rows[0].count, 10),
      activeApiKeys: parseInt(apiKeys.rows[0].count, 10),
    };
  }
}
