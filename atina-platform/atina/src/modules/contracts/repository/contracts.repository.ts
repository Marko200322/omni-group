import { query } from '../../../database/connection';
import type { CreateContractDtoType, UpdateContractDtoType } from '../dto/contracts.dto';

export class ContractsRepository {
  statsOverview(userId: string) {
    return Promise.all([
      query<{ status: string; count: string }>(
        'SELECT status, COUNT(*)::text AS count FROM contracts WHERE user_id = $1 GROUP BY status',
        [userId]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(value), 0)::text AS total FROM contracts
         WHERE user_id = $1 AND status = 'signed'`,
        [userId]
      ),
    ]);
  }

  list(userId: string, opts: { status?: string; limit: number; offset: number }) {
    const conditions = ['c.user_id = $1'];
    const values: unknown[] = [userId];
    let idx = 2;
    if (opts.status) {
      conditions.push(`c.status = $${idx++}`);
      values.push(opts.status);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    return Promise.all([
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM contracts c ${where}`, values),
      query(
        `SELECT c.*, cc.first_name || ' ' || COALESCE(cc.last_name, '') AS contact_name
         FROM contracts c
         LEFT JOIN crm_contacts cc ON c.contact_id = cc.id
         ${where}
         ORDER BY c.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, opts.limit, opts.offset]
      ),
    ]);
  }

  getById(id: string, userId: string) {
    return query(
      `SELECT c.*, cc.first_name || ' ' || COALESCE(cc.last_name, '') AS contact_name,
              cc.email AS contact_email
       FROM contracts c
       LEFT JOIN crm_contacts cc ON c.contact_id = cc.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [id, userId]
    );
  }

  create(userId: string, d: CreateContractDtoType) {
    return query(
      `INSERT INTO contracts
         (user_id, contact_id, title, content, status, value, currency,
          start_date, end_date, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        userId,
        d.contactId ?? null,
        d.title,
        d.content ?? null,
        d.status,
        d.value ?? null,
        d.currency,
        d.startDate ? new Date(d.startDate) : null,
        d.endDate ? new Date(d.endDate) : null,
        JSON.stringify(d.metadata),
      ]
    );
  }

  update(id: string, userId: string, d: UpdateContractDtoType) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    const map: Record<string, string> = {
      title: 'title',
      content: 'content',
      contactId: 'contact_id',
      status: 'status',
      value: 'value',
      currency: 'currency',
      startDate: 'start_date',
      endDate: 'end_date',
      metadata: 'metadata',
    };
    for (const [key, col] of Object.entries(map)) {
      if (d[key as keyof UpdateContractDtoType] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        const val =
          key === 'metadata'
            ? JSON.stringify(d.metadata)
            : key === 'startDate' || key === 'endDate'
              ? new Date(d[key as 'startDate' | 'endDate'] as string)
              : d[key as keyof UpdateContractDtoType];
        values.push(val);
      }
    }
    if (!fields.length) return null;
    values.push(id, userId);
    return query(
      `UPDATE contracts SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx++} AND user_id = $${idx}
       RETURNING *`,
      values
    );
  }

  sign(id: string, userId: string, signedBy: string) {
    return query(
      `UPDATE contracts
       SET status = 'signed', signed_at = NOW(), signed_by = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
         AND status NOT IN ('signed', 'canceled', 'expired')
       RETURNING *`,
      [id, userId, signedBy]
    );
  }

  getStatus(id: string, userId: string) {
    return query<{ status: string }>(
      `SELECT status FROM contracts WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
  }

  send(id: string, userId: string) {
    return query(
      `UPDATE contracts SET status = 'sent', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'draft'
       RETURNING *`,
      [id, userId]
    );
  }

  cancel(id: string, userId: string) {
    return query(
      `UPDATE contracts SET status = 'canceled', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status IN ('draft', 'sent')
       RETURNING *`,
      [id, userId]
    );
  }

  deleteDraft(id: string, userId: string) {
    return query(`DELETE FROM contracts WHERE id = $1 AND user_id = $2 AND status = 'draft'`, [
      id,
      userId,
    ]);
  }
}
