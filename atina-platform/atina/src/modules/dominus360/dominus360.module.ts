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

const CreateDominusDto = z
  .object({
    name: z.string().min(3).max(255),
    stage: z.string().min(2).max(32).default('v1'),
    budgetAllocated: z.number().min(0).default(0),
  })
  .strict();

const RunDominusDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['risk-scan', 'resource-allocation', 'forecast']).default('forecast'),
      input: z.record(z.unknown()).default({}),
    })
    .strict()
);

const EcosystemRunParamsDto = z
  .object({
    id: z.string().min(1).max(128),
  })
  .strict();

/** Coerce stored metrics (number | string | missing) to a non-negative integer for forecast counts. */
function nonNegativeForecastCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export class Dominus360Module implements IModule {
  name = 'Dominus360';
  slug = 'dominus360';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'enterprise';
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
         WHERE user_id = $1 AND system_slug = 'dominus360'
         ORDER BY created_at DESC`,
        [req.user!.userId]
      );
      sendSuccess(res, rows);
    });

    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateDominusDto), async (req, res) => {
      const d = req.body;
      const { rows } = await query(
        `INSERT INTO ecosystem_systems
         (user_id, system_slug, name, stage, budget_allocated, metrics)
         VALUES ($1, 'dominus360', $2, $3, $4, $5)
         RETURNING *`,
        [req.user!.userId, d.name, d.stage, d.budgetAllocated, JSON.stringify({ risk_score: 50, forecasts: 0 })]
      );
      await query(
        `INSERT INTO audit_events
         (actor_user_id, event_type, entity_type, entity_id, severity, payload)
         VALUES ($1, 'dominus360_created', 'ecosystem_system', $2, 'info', $3)`,
        [req.user!.userId, rows[0].id, JSON.stringify({ name: d.name, stage: d.stage })]
      );
      sendCreated(res, rows[0], 'Dominus360 workspace created');
    });

    this.router.post(
      '/:id/run',
      authenticate,
      authSessionLimiter,
      validateParams(EcosystemRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunDominusDto),
      async (req, res) => {
      const d = req.body;
      const { rows: systems } = await query(
        `SELECT * FROM ecosystem_systems
         WHERE id = $1 AND user_id = $2 AND system_slug = 'dominus360'`,
        [req.params.id, req.user!.userId]
      );
      if (!systems[0]) throw new NotFoundError('Dominus360 workspace');
      const system = systems[0] as { stage?: string; metrics?: { forecasts?: unknown } };
      const forecastsPrior = nonNegativeForecastCount(system.metrics?.forecasts);
      const forecastsNext = forecastsPrior + 1;

      if (d.mode !== 'risk-scan' && system.stage === 'v1') {
        throw new ValidationError(`Mode '${d.mode}' requires minimum readiness stage 'v2'`);
      }

      const delta = d.mode === 'resource-allocation' ? 130 : d.mode === 'risk-scan' ? 60 : 95;
      const output = {
        mode: d.mode,
        result: {
          risk_score: d.mode === 'risk-scan' ? 35 : 45,
          forecast_growth_pct: d.mode === 'forecast' ? 14.2 : 8.8,
        },
      };
      const inputPayload = { mode: d.mode, input: d.input };

      const { rows: runRows } = await query(
        `INSERT INTO ecosystem_runs
         (ecosystem_system_id, run_type, status, input_payload, output_payload, started_at, finished_at)
         VALUES ($1, $2, 'completed', $3, $4, NOW(), NOW())
         RETURNING *`,
        [req.params.id, `dominus_${d.mode}`, JSON.stringify(inputPayload), JSON.stringify(output)]
      );

      await query(
        `UPDATE ecosystem_systems
         SET revenue_generated = revenue_generated + $2,
             efficiency_score = LEAST(100, efficiency_score + 1.8),
             metrics = jsonb_set(
               COALESCE(metrics, '{}'::jsonb),
               '{forecasts}',
               to_jsonb($3::int)
             ),
             last_run_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [req.params.id, delta, forecastsNext]
      );
      await query(
        `INSERT INTO audit_events
         (actor_user_id, event_type, entity_type, entity_id, severity, payload)
         VALUES ($1, 'dominus360_run_completed', 'ecosystem_run', $2, 'info', $3)`,
        [req.user!.userId, runRows[0].id, JSON.stringify({ mode: d.mode, systemId: req.params.id })]
      );

      sendSuccess(res, runRows[0], 'Dominus360 run completed');
      }
    );
  }
}
