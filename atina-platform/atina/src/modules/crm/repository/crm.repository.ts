import { query } from '../../../database/connection';
import type { CreateContactDtoType, UpdateContactDtoType } from '../dto/crm.dto';

export class CrmRepository {
  listContacts(
    userId: string,
    opts: { search?: string; status?: string; limit: number; offset: number }
  ) {
    const conditions = ['user_id = $1'];
    const values: unknown[] = [userId];
    let idx = 2;

    if (opts.search) {
      conditions.push(
        `(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx} OR company ILIKE $${idx})`
      );
      values.push(`%${opts.search}%`);
      idx++;
    }
    if (opts.status) {
      conditions.push(`status = $${idx++}`);
      values.push(opts.status);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    return Promise.all([
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM crm_contacts ${where}`, values),
      query(
        `SELECT * FROM crm_contacts ${where}
         ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, opts.limit, opts.offset]
      ),
    ]);
  }

  getContact(id: string, userId: string) {
    return query('SELECT * FROM crm_contacts WHERE id = $1 AND user_id = $2', [id, userId]);
  }

  createContact(userId: string, d: CreateContactDtoType) {
    return query(
      `INSERT INTO crm_contacts
         (user_id, first_name, last_name, email, phone, company, position,
          status, source, tags, notes, custom_fields)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        userId,
        d.firstName,
        d.lastName ?? null,
        d.email ?? null,
        d.phone ?? null,
        d.company ?? null,
        d.position ?? null,
        d.status,
        d.source ?? null,
        d.tags,
        d.notes ?? null,
        JSON.stringify(d.customFields),
      ]
    );
  }

  updateContact(id: string, userId: string, d: UpdateContactDtoType) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const map: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      phone: 'phone',
      company: 'company',
      position: 'position',
      status: 'status',
      source: 'source',
      tags: 'tags',
      notes: 'notes',
      customFields: 'custom_fields',
    };

    for (const [key, col] of Object.entries(map)) {
      if (d[key as keyof UpdateContactDtoType] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(
          key === 'customFields' ? JSON.stringify(d.customFields) : d[key as keyof UpdateContactDtoType]
        );
      }
    }

    if (!fields.length) {
      return this.getContact(id, userId);
    }

    values.push(id, userId);
    return query(
      `UPDATE crm_contacts SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx++} AND user_id = $${idx}
       RETURNING *`,
      values
    );
  }

  deleteContact(id: string, userId: string) {
    return query('DELETE FROM crm_contacts WHERE id = $1 AND user_id = $2', [id, userId]);
  }

  bulkInsertContact(
    userId: string,
    row: {
      firstName?: string;
      first_name?: string;
      lastName?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      company?: string;
      status?: string;
    }
  ) {
    return query(
      `INSERT INTO crm_contacts
         (user_id, first_name, last_name, email, phone, company, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT DO NOTHING`,
      [
        userId,
        row.firstName ?? row.first_name,
        row.lastName ?? row.last_name ?? null,
        row.email ?? null,
        row.phone ?? null,
        row.company ?? null,
        row.status ?? 'lead',
      ]
    );
  }

  stats(userId: string) {
    return Promise.all([
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM crm_contacts WHERE user_id = $1', [
        userId,
      ]),
      query<{ status: string; count: string }>(
        'SELECT status, COUNT(*)::text AS count FROM crm_contacts WHERE user_id = $1 GROUP BY status',
        [userId]
      ),
      query(
        `SELECT * FROM crm_contacts WHERE user_id = $1
         ORDER BY updated_at DESC LIMIT 5`,
        [userId]
      ),
    ]);
  }
}
