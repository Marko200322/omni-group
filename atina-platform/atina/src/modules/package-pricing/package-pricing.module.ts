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
import { computePackagePricingRun, type PricingMetrics } from './package-pricing.stub';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

const CreatePackagePricingDto = z
  .object({
    name: z.string().trim().min(3).max(255),
    budgetAllocated: z.number().finite().min(0).default(0),
    basePrice: z.number().finite().min(0).default(99),
  })
  .strict();

const RunPackagePricingDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['list-tiers', 'adjust-price', 'bundle']).default('list-tiers'),
      input: z.record(z.unknown()).default({}),
    })
    .strict()
);

const EcosystemRunParamsDto = z
  .object({
    id: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
  })
  .strict();

const SYSTEM_SLUG = 'package-pricing';

export class PackagePricingModule implements IModule {
  name = 'Package Pricing';
  slug = SYSTEM_SLUG;
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
         WHERE user_id = $1 AND system_slug = $2
         ORDER BY created_at DESC`,
        [req.user!.userId, SYSTEM_SLUG]
      );
      sendSuccess(res, rows);
    });

    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreatePackagePricingDto), async (req, res) => {
      const d = req.body;
      const { rows } = await query(
        `INSERT INTO ecosystem_systems
         (user_id, system_slug, name, budget_allocated, metrics)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          req.user!.userId,
          SYSTEM_SLUG,
          d.name,
          d.budgetAllocated,
          JSON.stringify({
            base_price: d.basePrice,
            tiers_count: 0,
            bundles_proposed: 0,
          }),
        ]
      );
      await query(
        `INSERT INTO audit_events
         (actor_user_id, event_type, entity_type, entity_id, severity, payload)
         VALUES ($1, 'package_pricing_created', 'ecosystem_system', $2, 'info', $3)`,
        [req.user!.userId, rows[0].id, JSON.stringify({ name: d.name })]
      );
      sendCreated(res, rows[0], 'Package pricing workspace created');
    });

    this.router.post(
      '/:id/run',
      authenticate,
      authSessionLimiter,
      validateParams(EcosystemRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunPackagePricingDto),
      async (req, res) => {
        const d = req.body;
        const { rows: systems } = await query(
          `SELECT * FROM ecosystem_systems
           WHERE id = $1 AND user_id = $2 AND system_slug = $3`,
          [req.params.id, req.user!.userId, SYSTEM_SLUG]
        );
        if (!systems[0]) throw new NotFoundError('Package pricing workspace');
        const system = systems[0] as { metrics?: PricingMetrics };
        const metrics = system.metrics ?? {};

        const computed = computePackagePricingRun(d.mode, metrics, d.input, req.params.id);
        if ('error' in computed) {
          throw new ValidationError(computed.error.message);
        }
        const { outputPayload, revenueDelta, metricsPatch } = computed;

        const inputPayload = { mode: d.mode, input: d.input };
        const runType = `${SYSTEM_SLUG}_${d.mode}`;

        const { rows: runRows } = await query(
          `INSERT INTO ecosystem_runs
           (ecosystem_system_id, run_type, status, input_payload, output_payload, started_at, finished_at)
           VALUES ($1, $2, 'completed', $3, $4, NOW(), NOW())
           RETURNING *`,
          [req.params.id, runType, JSON.stringify(inputPayload), JSON.stringify(outputPayload)]
        );

        await query(
          `UPDATE ecosystem_systems
           SET revenue_generated = revenue_generated + $2,
               efficiency_score = LEAST(100, efficiency_score + 1.8),
               metrics = metrics || $3::jsonb,
               last_run_at = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [req.params.id, revenueDelta, JSON.stringify(metricsPatch)]
        );
        await query(
          `INSERT INTO audit_events
           (actor_user_id, event_type, entity_type, entity_id, severity, payload)
           VALUES ($1, 'package_pricing_run_completed', 'ecosystem_run', $2, 'info', $3)`,
          [req.user!.userId, runRows[0].id, JSON.stringify({ mode: d.mode, systemId: req.params.id })]
        );

        sendSuccess(res, runRows[0], 'Package pricing run completed');
      }
    );
  }
}
