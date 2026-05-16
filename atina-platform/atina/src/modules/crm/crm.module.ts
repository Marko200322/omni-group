import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { query } from '../../database/connection';
import { sendSuccess, sendCreated, paginate } from '../../utils/response';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { z } from 'zod';
import { NotFoundError } from '../../utils/errors';

const CreateContactDto = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
    company: z.string().max(255).optional(),
    position: z.string().max(100).optional(),
    status: z.enum(['lead', 'prospect', 'customer', 'churned', 'partner']).default('lead'),
    source: z.string().max(50).optional(),
    tags: z.array(z.string()).default([]),
    notes: z.string().optional(),
    customFields: z.record(z.unknown()).default({}),
  })
  .strict();

const UpdateContactDto = CreateContactDto.partial().strict();

const ContactQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).catch(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    status: z.enum(['lead', 'prospect', 'customer', 'churned', 'partner']).optional(),
  })
  .strict();

const ContactIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

const BulkContactRowDto = z
  .object({
    firstName: z.string().max(100).optional(),
    first_name: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    last_name: z.string().max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
    company: z.string().max(255).optional(),
    status: z.enum(['lead', 'prospect', 'customer', 'churned', 'partner']).optional(),
  })
  .passthrough();

const BulkImportContactsDto = z
  .object({
    contacts: z.array(BulkContactRowDto).max(1000).default([]),
  })
  .strict();

export class CrmModule implements IModule {
  name = 'CRM';
  slug = 'crm';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // List contacts
    this.router.get(
      '/contacts',
      authenticate,
      authSessionLimiter,
      validateQuery(ContactQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
      const parsed = req.query as unknown as z.infer<typeof ContactQueryDto>;
      const { page, limit, search, status } = parsed;
      const offset = (page - 1) * limit;

      const conditions = ['user_id = $1'];
      const values: unknown[] = [req.user!.userId];
      let idx = 2;

      if (search) {
        conditions.push(`(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx} OR company ILIKE $${idx})`);
        values.push(`%${search}%`);
        idx++;
      }
      if (status) {
        conditions.push(`status = $${idx++}`);
        values.push(status);
      }

      const where = `WHERE ${conditions.join(' AND ')}`;

      const { rows: countRows } = await query<{ count: string }>(
        `SELECT COUNT(*) FROM crm_contacts ${where}`, values
      );
      const { rows } = await query(
        `SELECT * FROM crm_contacts ${where}
         ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      );

      paginate(res, rows, parseInt(countRows[0].count, 10), page, limit);
      }
    );

    // Bulk import (before :id routes)
    this.router.post('/contacts/bulk', authenticate, authSessionLimiter, validateQuery(StrictEmptyQueryDto), validateBody(BulkImportContactsDto), async (req, res) => {
      const contacts = (req.body as z.infer<typeof BulkImportContactsDto>).contacts;
      if (!contacts.length) return sendSuccess(res, { imported: 0 });

      let imported = 0;
      for (const c of contacts) {
        try {
          await query(
            `INSERT INTO crm_contacts
               (user_id, first_name, last_name, email, phone, company, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT DO NOTHING`,
            [req.user!.userId, c.firstName || c.first_name, c.lastName || c.last_name || null,
             c.email || null, c.phone || null, c.company || null, c.status || 'lead']
          );
          imported++;
        } catch { /* skip bad records */ }
      }

      sendCreated(res, { imported }, `${imported} contacts imported`);
    });

    // Get single contact
    this.router.get(
      '/contacts/:id',
      authenticate,
      authSessionLimiter,
      validateParams(ContactIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
      const { rows } = await query(
        'SELECT * FROM crm_contacts WHERE id = $1 AND user_id = $2',
        [req.params.id, req.user!.userId]
      );
      if (!rows[0]) throw new NotFoundError('Contact');
      sendSuccess(res, rows[0]);
      }
    );

    // Create contact
    this.router.post('/contacts', authenticate, authSessionLimiter, validateQuery(StrictEmptyQueryDto), validateBody(CreateContactDto), async (req, res) => {
      const d = req.body;
      const { rows } = await query(
        `INSERT INTO crm_contacts
           (user_id, first_name, last_name, email, phone, company, position,
            status, source, tags, notes, custom_fields)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          req.user!.userId, d.firstName, d.lastName || null, d.email || null,
          d.phone || null, d.company || null, d.position || null,
          d.status, d.source || null, d.tags, d.notes || null,
          JSON.stringify(d.customFields),
        ]
      );
      sendCreated(res, rows[0], 'Contact created');
    });

    // Update contact
    this.router.patch('/contacts/:id', authenticate, authSessionLimiter, validateParams(ContactIdParamsDto), validateQuery(StrictEmptyQueryDto), validateBody(UpdateContactDto), async (req, res) => {
      const d = req.body;
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const map: Record<string, string> = {
        firstName: 'first_name', lastName: 'last_name', email: 'email',
        phone: 'phone', company: 'company', position: 'position',
        status: 'status', source: 'source', tags: 'tags', notes: 'notes',
        customFields: 'custom_fields',
      };

      for (const [key, col] of Object.entries(map)) {
        if (d[key] !== undefined) {
          fields.push(`${col} = $${idx++}`);
          values.push(key === 'customFields' ? JSON.stringify(d[key]) : d[key]);
        }
      }

      if (!fields.length) {
        const { rows } = await query(
          'SELECT * FROM crm_contacts WHERE id = $1 AND user_id = $2',
          [req.params.id, req.user!.userId]
        );
        return sendSuccess(res, rows[0]);
      }

      values.push(req.params.id, req.user!.userId);
      const { rows } = await query(
        `UPDATE crm_contacts SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${idx++} AND user_id = $${idx}
         RETURNING *`,
        values
      );
      if (!rows[0]) throw new NotFoundError('Contact');
      sendSuccess(res, rows[0], 'Contact updated');
    });

    // Delete contact
    this.router.delete(
      '/contacts/:id',
      authenticate,
      authSessionLimiter,
      validateParams(ContactIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const { rowCount } = await query(
          'DELETE FROM crm_contacts WHERE id = $1 AND user_id = $2',
          [req.params.id, req.user!.userId]
        );
        if (rowCount === 0) throw new NotFoundError('Contact');
        sendSuccess(res, null, 'Contact deleted');
      }
    );

    // CRM stats
    this.router.get(
      '/stats',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
      const userId = req.user!.userId;
      const [total, byStatus, recentActivity] = await Promise.all([
        query<{ count: string }>('SELECT COUNT(*) FROM crm_contacts WHERE user_id = $1', [userId]),
        query<{ status: string; count: string }>(
          'SELECT status, COUNT(*) FROM crm_contacts WHERE user_id = $1 GROUP BY status', [userId]
        ),
        query(
          `SELECT * FROM crm_contacts WHERE user_id = $1
           ORDER BY updated_at DESC LIMIT 5`, [userId]
        ),
      ]);

      sendSuccess(res, {
        total: parseInt(total.rows[0].count, 10),
        byStatus: Object.fromEntries(byStatus.rows.map(r => [r.status, parseInt(r.count, 10)])),
        recentActivity: recentActivity.rows,
      });
      }
    );

  }
}
