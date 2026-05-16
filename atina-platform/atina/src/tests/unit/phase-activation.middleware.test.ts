import type { Request, Response, NextFunction } from 'express';
import * as db from '../../database/connection';
import logger from '../../utils/logger';
import {
  createPhaseActivationGuard,
  getCurrentPhase,
  getModulePhaseGatingStatus,
  getModulePhaseRequirements,
  getPhaseOrder,
  resetPhaseActivationCache,
} from '../../modules/phase-launch/middleware/phase-activation.middleware';

jest.mock('../../database/connection');
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('phase activation middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPhaseActivationCache();
  });

  it('returns lock/unlock status for atina modules at v2', () => {
    const status = getModulePhaseGatingStatus('v2');
    const bySlug = new Map(status.map((row) => [row.moduleSlug, row]));

    expect(bySlug.get('atina-system')).toMatchObject({ requiredPhase: 'v3', unlocked: false });
    expect(bySlug.get('sistem-naplate')).toMatchObject({ requiredPhase: 'v3', unlocked: false });
    expect(bySlug.get('forge')).toMatchObject({ requiredPhase: 'v3', unlocked: false });
    expect(bySlug.get('titan-score')).toMatchObject({ requiredPhase: 'v3', unlocked: false });
  });

  it('at v6 every MODULE_MIN_PHASE module is unlocked (incl. client-hunter, lead-scoring, proxy-rotation)', () => {
    const requirements = getModulePhaseRequirements();
    const status = getModulePhaseGatingStatus('v6');
    const bySlug = new Map(status.map((row) => [row.moduleSlug, row]));

    for (const slug of Object.keys(requirements)) {
      expect(bySlug.get(slug)).toMatchObject({
        requiredPhase: requirements[slug],
        unlocked: true,
      });
    }
  });

  it('keeps finalized phase requirements for atina-system, sistem-naplate and forge', () => {
    const requirements = getModulePhaseRequirements();
    expect(requirements['atina-system']).toBe('v3');
    expect(requirements['sistem-naplate']).toBe('v3');
    expect(requirements.forge).toBe('v3');
    expect(requirements['titan-score']).toBe('v3');
  });

  it('blocks write requests when module phase is locked', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ config: { current_phase: 'v2' } }],
      rowCount: 1,
    } as never);

    const guard = createPhaseActivationGuard('atina-system');
    const req = { method: 'POST' } as Request;
    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })) } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'PHASE_LOCKED',
        }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('allows write requests when module phase is unlocked', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ config: { current_phase: 'v3' } }],
      rowCount: 1,
    } as never);

    const guard = createPhaseActivationGuard('forge');
    const req = { method: 'POST' } as Request;
    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    await guard(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('passes through for unknown module slugs (no gating)', async () => {
    const guard = createPhaseActivationGuard('totally-unknown-module');
    const req = { method: 'POST' } as Request;
    const next = jest.fn() as NextFunction;

    await guard(req, {} as Response, next);

    expect(mockQuery).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it.each(['GET', 'HEAD', 'OPTIONS'] as const)(
    'skips phase check for safe method %s even when locked',
    async (method) => {
      mockQuery.mockResolvedValue({
        rows: [{ config: { current_phase: 'v1' } }],
        rowCount: 1,
      } as never);

      const guard = createPhaseActivationGuard('forge');
      const req = { method } as Request;
      const next = jest.fn() as NextFunction;

      await guard(req, {} as Response, next);

      expect(next).toHaveBeenCalled();
    }
  );

  it('maps unknown phase value from DB to v1', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ config: { current_phase: 'not-a-real-phase' } }],
      rowCount: 1,
    } as never);

    await expect(getCurrentPhase()).resolves.toBe('v1');
  });

  it('exposes ordered phase list via getPhaseOrder', () => {
    expect(getPhaseOrder()).toEqual(['v1', 'v2', 'v3', 'v4', 'v5', 'v6']);
  });

  it('allows write on DB error (fail-open) and logs a warning', async () => {
    mockQuery.mockRejectedValueOnce(new Error('db down'));

    const guard = createPhaseActivationGuard('forge');
    const req = { method: 'POST' } as Request;
    const next = jest.fn() as NextFunction;

    await guard(req, {} as Response, next);

    expect(logger.warn).toHaveBeenCalledWith(
      'Phase activation guard fallback (allowing request)',
      expect.objectContaining({ moduleSlug: 'forge' })
    );
    expect(next).toHaveBeenCalled();
  });

  it('sendError shape matches API contract for phase lock (403)', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ config: { current_phase: 'v2' } }],
      rowCount: 1,
    } as never);

    const guard = createPhaseActivationGuard('atina-system');
    const req = { method: 'PUT' } as Request;
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = { status } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await guard(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'PHASE_LOCKED',
          message: expect.stringContaining('atina-system'),
          details: expect.objectContaining({
            moduleSlug: 'atina-system',
            requiredPhase: 'v3',
            currentPhase: 'v2',
          }),
        }),
      })
    );
  });
});
