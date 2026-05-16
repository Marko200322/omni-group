import { Router } from 'express';
import { z } from 'zod';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { query } from '../../database/connection';
import { sendCreated, sendSuccess } from '../../utils/response';
import { NotFoundError, ValidationError } from '../../utils/errors';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

const CreateCraftorDto = z
  .object({
    name: z.string().min(3).max(255),
    budgetAllocated: z.number().min(0).default(0),
    leadTarget: z.number().min(1).max(100000).default(100),
  })
  .strict();

const RunCraftorDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['lead-hunt', 'follow-up', 'deal-close']).default('lead-hunt'),
      input: z.record(z.unknown()).default({}),
    })
    .strict()
);

const EcosystemRunParamsDto = z
  .object({
    id: z.string().min(1).max(128),
  })
  .strict();

/** Coerce stored metrics (number | string | missing) to a non-negative integer for readiness checks. */
function nonNegativeLeadCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export class CraftorModule implements IModule {
  name = 'Craftor';
  slug = 'craftor';
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
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), async (req, res) => {
      const { rows } = await query(
        `SELECT * FROM ecosystem_systems
         WHERE user_id = $1 AND system_slug = 'craftor'
         ORDER BY created_at DESC`,
        [req.user!.userId]
      );
      sendSuccess(res, rows);
    });

    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateCraftorDto), async (req, res) => {
      const d = req.body;
      const { rows } = await query(
        `INSERT INTO ecosystem_systems
         (user_id, system_slug, name, budget_allocated, metrics)
         VALUES ($1, 'craftor', $2, $3, $4)
         RETURNING *`,
        [
          req.user!.userId,
          d.name,
          d.budgetAllocated,
          JSON.stringify({ lead_target: d.leadTarget, leads_collected: 0, deals_closed: 0 }),
        ]
      );
      await query(
        `INSERT INTO audit_events
         (actor_user_id, event_type, entity_type, entity_id, severity, payload)
         VALUES ($1, 'craftor_created', 'ecosystem_system', $2, 'info', $3)`,
        [req.user!.userId, rows[0].id, JSON.stringify({ name: d.name })]
      );
      sendCreated(res, rows[0], 'Craftor campaign created');
    });

    this.router.post(
      '/:id/run',
      authenticate,
      authSessionLimiter,
      validateParams(EcosystemRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunCraftorDto),
      async (req, res) => {
      const d = req.body;
      const { rows: systems } = await query(
        `SELECT * FROM ecosystem_systems
         WHERE id = $1 AND user_id = $2 AND system_slug = 'craftor'`,
        [req.params.id, req.user!.userId]
      );
      if (!systems[0]) throw new NotFoundError('Craftor campaign');
      const system = systems[0] as { metrics?: { leads_collected?: unknown } };
      const leadsCollected = nonNegativeLeadCount(system.metrics?.leads_collected);

      if (d.mode === 'deal-close' && leadsCollected < 10) {
        throw new ValidationError("Mode 'deal-close' requires minimum readiness of 10 collected leads");
      }

      const leads = d.mode === 'lead-hunt' ? 23 : d.mode === 'follow-up' ? 9 : 4;
      const revenue = d.mode === 'deal-close' ? 320 : d.mode === 'follow-up' ? 140 : 60;
      const newLeadsCollected = leadsCollected + leads;
      const inputPayload = { mode: d.mode, input: d.input };
      const outputPayload = {
        mode: d.mode,
        result: {
          new_leads: leads,
          estimated_revenue: revenue,
        },
      };

      const { rows: runRows } = await query(
        `INSERT INTO ecosystem_runs
         (ecosystem_system_id, run_type, status, input_payload, output_payload, started_at, finished_at)
         VALUES ($1, $2, 'completed', $3, $4, NOW(), NOW())
         RETURNING *`,
        [req.params.id, `craftor_${d.mode}`, JSON.stringify(inputPayload), JSON.stringify(outputPayload)]
      );

      await query(
        `UPDATE ecosystem_systems
         SET revenue_generated = revenue_generated + $2,
             efficiency_score = LEAST(100, efficiency_score + 2.2),
             metrics = COALESCE(metrics, '{}'::jsonb)
               || jsonb_build_object(
                 'last_mode', $3::text,
                 'last_leads', $4::int,
                 'leads_collected', $5::int
               ),
             last_run_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [req.params.id, revenue, d.mode, leads, newLeadsCollected]
      );
      await query(
        `INSERT INTO audit_events
         (actor_user_id, event_type, entity_type, entity_id, severity, payload)
         VALUES ($1, 'craftor_run_completed', 'ecosystem_run', $2, 'info', $3)`,
        [req.user!.userId, runRows[0].id, JSON.stringify({ mode: d.mode, systemId: req.params.id })]
      );

      sendSuccess(res, runRows[0], 'Craftor cycle completed');
      }
    );
  }
}
