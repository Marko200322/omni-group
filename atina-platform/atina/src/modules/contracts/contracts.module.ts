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
import { ConflictError, NotFoundError } from '../../utils/errors';

function refineContractDates(
  data: { startDate?: string; endDate?: string },
  ctx: z.RefinementCtx
): void {
  const parse = (raw: string | undefined, path: (string | number)[]): Date | undefined => {
    if (raw === undefined) return undefined;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date', path });
      return undefined;
    }
    return d;
  };
  const start = parse(data.startDate, ['startDate']);
  const end = parse(data.endDate, ['endDate']);
  if (start !== undefined && end !== undefined && end < start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    });
  }
}

const CreateContractShape = z
  .object({
    title: z.string().min(1).max(255),
    content: z.string().optional(),
    contactId: z.string().uuid().optional(),
    status: z.enum(['draft', 'sent', 'signed', 'expired', 'canceled']).default('draft'),
    value: z.number().finite().positive().optional(),
    currency: z.string().length(3).default('USD'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export const CreateContractDto = CreateContractShape.superRefine(refineContractDates);

export const UpdateContractDto = CreateContractShape.partial()
  .strict()
  .superRefine((data, ctx) => {
    if (data.startDate !== undefined || data.endDate !== undefined) {
      refineContractDates({ startDate: data.startDate, endDate: data.endDate }, ctx);
    }
  });

export const SignContractDto = z
  .object({
    signedBy: z.string().min(1),
  })
  .strict();

export const ContractIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const ContractsListQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).catch(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['draft', 'sent', 'signed', 'expired', 'canceled']).optional(),
  })
  .strict();

export class ContractsModule implements IModule {
  name = 'Contracts';
  slug = 'contracts';
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
    // Stats (static path before /:id)
    this.router.get(
      '/stats/overview',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
      const userId = req.user!.userId;
      const [byStatus, totalValue] = await Promise.all([
        query<{ status: string; count: string }>(
          'SELECT status, COUNT(*) FROM contracts WHERE user_id = $1 GROUP BY status', [userId]
        ),
        query<{ total: string }>(
          `SELECT COALESCE(SUM(value), 0) AS total FROM contracts
           WHERE user_id = $1 AND status = 'signed'`, [userId]
        ),
      ]);

      sendSuccess(res, {
        byStatus: Object.fromEntries(byStatus.rows.map(r => [r.status, parseInt(r.count, 10)])),
        totalSignedValue: parseFloat(String(totalValue.rows[0]?.total ?? 0)),
      });
      }
    );

    // List contracts
    this.router.get(
      '/',
      authenticate,
      authSessionLimiter,
      validateQuery(ContractsListQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
      const { page, limit, status } = req.query as unknown as z.infer<typeof ContractsListQueryDto>;
      const offset = (page - 1) * limit;
      const userId = req.user!.userId;

      const conditions = ['c.user_id = $1'];
      const values: unknown[] = [userId];
      let idx = 2;

      if (status) { conditions.push(`c.status = $${idx++}`); values.push(status); }

      const where = `WHERE ${conditions.join(' AND ')}`;
      const { rows: countRows } = await query<{ count: string }>(
        `SELECT COUNT(*) FROM contracts c ${where}`, values
      );
      const { rows } = await query(
        `SELECT c.*, cc.first_name || ' ' || COALESCE(cc.last_name, '') AS contact_name
         FROM contracts c
         LEFT JOIN crm_contacts cc ON c.contact_id = cc.id
         ${where}
         ORDER BY c.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      );

      paginate(res, rows, parseInt(countRows[0].count, 10), page, limit);
      }
    );

    // Get single contract
    this.router.get(
      '/:id',
      authenticate,
      authSessionLimiter,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const { rows } = await query(
          `SELECT c.*, cc.first_name || ' ' || COALESCE(cc.last_name, '') AS contact_name,
                  cc.email AS contact_email
           FROM contracts c
           LEFT JOIN crm_contacts cc ON c.contact_id = cc.id
           WHERE c.id = $1 AND c.user_id = $2`,
          [req.params.id, req.user!.userId]
        );
        if (!rows[0]) throw new NotFoundError('Contract');
        sendSuccess(res, rows[0]);
      }
    );

    // Create contract
    this.router.post('/', authenticate, authSessionLimiter, validateQuery(StrictEmptyQueryDto), validateBody(CreateContractDto), async (req, res) => {
      const d = req.body;
      const { rows } = await query(
        `INSERT INTO contracts
           (user_id, contact_id, title, content, status, value, currency,
            start_date, end_date, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [
          req.user!.userId, d.contactId || null, d.title, d.content || null,
          d.status, d.value || null, d.currency,
          d.startDate ? new Date(d.startDate) : null,
          d.endDate ? new Date(d.endDate) : null,
          JSON.stringify(d.metadata),
        ]
      );
      sendCreated(res, rows[0], 'Contract created');
    });

    // Update contract
    this.router.patch('/:id', authenticate, authSessionLimiter, validateParams(ContractIdParamsDto), validateQuery(StrictEmptyQueryDto), validateBody(UpdateContractDto), async (req, res) => {
      const d = req.body;
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const map: Record<string, string> = {
        title: 'title', content: 'content', contactId: 'contact_id',
        status: 'status', value: 'value', currency: 'currency',
        startDate: 'start_date', endDate: 'end_date', metadata: 'metadata',
      };

      for (const [key, col] of Object.entries(map)) {
        if (d[key] !== undefined) {
          fields.push(`${col} = $${idx++}`);
          const val = key === 'metadata' ? JSON.stringify(d[key])
            : (key === 'startDate' || key === 'endDate') ? new Date(d[key])
            : d[key];
          values.push(val);
        }
      }

      if (!fields.length) return sendSuccess(res, { message: 'No changes' });

      values.push(req.params.id, req.user!.userId);
      const { rows } = await query(
        `UPDATE contracts SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${idx++} AND user_id = $${idx}
         RETURNING *`,
        values
      );
      if (!rows[0]) throw new NotFoundError('Contract');
      sendSuccess(res, rows[0], 'Contract updated');
    });

    // Sign contract
    this.router.post('/:id/sign', authenticate, authSessionLimiter, validateParams(ContractIdParamsDto), validateQuery(StrictEmptyQueryDto), validateBody(SignContractDto), async (req, res) => {
      const { rows } = await query(
        `UPDATE contracts
         SET status = 'signed', signed_at = NOW(), signed_by = $3, updated_at = NOW()
         WHERE id = $1 AND user_id = $2
           AND status NOT IN ('signed', 'canceled', 'expired')
         RETURNING *`,
        [req.params.id, req.user!.userId, req.body.signedBy]
      );
      if (rows[0]) return sendSuccess(res, rows[0], 'Contract signed');

      const existing = await query<{ status: string }>(
        `SELECT status FROM contracts WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user!.userId]
      );
      if (!existing.rows[0]) throw new NotFoundError('Contract');
      if (existing.rows[0].status === 'signed') {
        throw new ConflictError('Contract is already signed');
      }
      throw new ConflictError('Contract cannot be signed in its current status');
    });

    // Send contract
    this.router.post(
      '/:id/send',
      authenticate,
      authSessionLimiter,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const { rows } = await query(
          `UPDATE contracts SET status = 'sent', updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status = 'draft'
         RETURNING *`,
          [req.params.id, req.user!.userId]
        );
        if (!rows[0]) throw new NotFoundError('Contract or contract is not in draft status');
        sendSuccess(res, rows[0], 'Contract sent');
      }
    );

    // Cancel contract (withdraw draft or recall sent; not signed / expired / already canceled)
    this.router.post(
      '/:id/cancel',
      authenticate,
      authSessionLimiter,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const { rows } = await query(
          `UPDATE contracts SET status = 'canceled', updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status IN ('draft', 'sent')
         RETURNING *`,
          [req.params.id, req.user!.userId]
        );
        if (!rows[0]) throw new NotFoundError('Contract or contract cannot be canceled from current status');
        sendSuccess(res, rows[0], 'Contract canceled');
      }
    );

    // Delete contract
    this.router.delete(
      '/:id',
      authenticate,
      authSessionLimiter,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const { rowCount } = await query(
          `DELETE FROM contracts WHERE id = $1 AND user_id = $2 AND status = 'draft'`,
          [req.params.id, req.user!.userId]
        );
        if (rowCount === 0) throw new NotFoundError('Contract or only draft contracts can be deleted');
        sendSuccess(res, null, 'Contract deleted');
      }
    );
  }
}
