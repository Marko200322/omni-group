import { Request, Response, NextFunction, RequestHandler } from 'express';
import { query } from '../../../database/connection';
import logger from '../../../utils/logger';
import { sendError } from '../../../utils/response';
import {
  comparePhase,
  maxPhase,
  parsePhase,
  PHASE_ORDER,
  resolvePhaseFromEnv,
  type Phase,
} from '../../../core/phase-env';

export type { Phase };
export { PHASE_ORDER, getPhaseOrder };

const FINALIZED_ATINA_ECOSYSTEM_PHASE_RULES: Record<'atina-system' | 'sistem-naplate' | 'forge', Phase> = {
  'atina-system': 'v3',
  'sistem-naplate': 'v3',
  forge: 'v3',
};

// Initial gating map for ecosystem modules. This can expand as modules mature.
const MODULE_MIN_PHASE: Record<string, Phase> = {
  billing: 'v2',
  payments: 'v2',
  subscriptions: 'v1',
  crm: 'v1',
  analytics: 'v2',
  craftor: 'v1',
  'digital-signature': 'v2',
  titanis: 'v1',
  dominus360: 'v2',
  omnitube: 'v2',
  titanix: 'v2',
  omnigame: 'v3',
  'apex-predator': 'v3',
  'titan-score': 'v3',
  'client-hunter': 'v2',
  'lead-scoring': 'v2',
  'proxy-rotation': 'v2',
  outreach: 'v2',
  'follow-up': 'v2',
  'follow-up-automation': 'v2',
  'package-pricing': 'v2',
  'deal-offer': 'v2',
  'template-engine': 'v2',
  validator: 'v2',
  ...FINALIZED_ATINA_ECOSYSTEM_PHASE_RULES,
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CACHE_TTL_MS = 15000;

let cachedPhase: Phase = 'v1';
let cachedAt = 0;

/** Clears cached phase (for tests). */
export function resetPhaseActivationCache(): void {
  cachedPhase = 'v1';
  cachedAt = 0;
}

function getPhaseOrder(): readonly Phase[] {
  return PHASE_ORDER;
}

async function readCurrentPhase(): Promise<Phase> {
  const now = Date.now();
  if (now - cachedAt <= CACHE_TTL_MS) return cachedPhase;

  const envPhase = parsePhase(process.env.PHASE);
  let dbPhase: Phase = 'v1';

  try {
    const { rows } = await query<{ config: Record<string, unknown> }>(
      `SELECT config FROM modules WHERE slug = 'phase-launch-control' LIMIT 1`
    );
    const config = rows[0]?.config ?? {};
    const raw = String(config.current_phase ?? 'v1');
    dbPhase = parsePhase(raw) ?? 'v1';
  } catch (error) {
    logger.warn('Phase read from DB failed; using env/default', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const resolved = envPhase ? maxPhase(envPhase, dbPhase) : dbPhase;
  cachedPhase = resolved;
  cachedAt = now;
  return cachedPhase;
}

export function getEffectivePhaseForBoot(): Phase {
  return resolvePhaseFromEnv();
}

export async function getCurrentPhase(): Promise<Phase> {
  return readCurrentPhase();
}

export function getModulePhaseRequirements(): Record<string, Phase> {
  return { ...MODULE_MIN_PHASE };
}

export function getModulePhaseGatingStatus(currentPhase: Phase): Array<{
  moduleSlug: string;
  requiredPhase: Phase;
  unlocked: boolean;
}> {
  return Object.entries(MODULE_MIN_PHASE)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([moduleSlug, requiredPhase]) => ({
      moduleSlug,
      requiredPhase,
      unlocked: comparePhase(currentPhase, requiredPhase) >= 0,
    }));
}

export function createPhaseActivationGuard(moduleSlug: string): RequestHandler {
  const requiredPhase = MODULE_MIN_PHASE[moduleSlug];
  if (!requiredPhase) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();

    try {
      const currentPhase = await readCurrentPhase();
      if (comparePhase(currentPhase, requiredPhase) >= 0) return next();

      return sendError(
        res,
        `Module '${moduleSlug}' requires phase ${requiredPhase}. Current phase is ${currentPhase}.`,
        403,
        'PHASE_LOCKED',
        {
          moduleSlug,
          requiredPhase,
          currentPhase,
        }
      );
    } catch (error) {
      logger.warn('Phase activation guard fallback (allowing request)', {
        moduleSlug,
        error: error instanceof Error ? error.message : String(error),
      });
      return next();
    }
  };
}

