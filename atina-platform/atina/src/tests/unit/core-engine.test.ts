import http from 'http';
import request from 'supertest';
import express, { NextFunction, Request, Response } from 'express';
import { CoreEngine } from '../../core/CoreEngine';
import { moduleRegistry } from '../../core/ModuleRegistry';
import { config } from '../../config';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';
import { getForgeHealthDetails } from '../../modules/forge/service/forge-health.service';

const testConnectionMock = jest.fn().mockResolvedValue(true);

jest.mock('../../database/connection', () => ({
  testConnection: (...a: unknown[]) => testConnectionMock(...a),
  query: jest.fn(),
  getClient: jest.fn(),
  transaction: jest.fn(),
  closePool: jest.fn().mockResolvedValue(undefined),
  default: {},
}));

jest.mock('../../modules/forge/service/forge-health.service', () => ({
  getForgeHealthDetails: jest.fn(),
}));

/** Insert before the catch-all 404 (second-to-last layer is 404; last is the 4-arg error handler). */
function insertBefore404(app: express.Application, handler: express.RequestHandler) {
  const r = express.Router();
  r.use(handler);
  const newLayer = (r as unknown as { stack: unknown[] }).stack[0];
  const stack = (app as unknown as { _router: { stack: unknown[] } })._router.stack;
  stack.splice(stack.length - 2, 0, newLayer);
}

type AppConfigSlice = Pick<typeof config.app, 'isDev' | 'isProd' | 'url' | 'env'>;

function snapshotAppConfig(): AppConfigSlice {
  return {
    isDev: config.app.isDev,
    isProd: config.app.isProd,
    url: config.app.url,
    env: config.app.env,
  };
}

function restoreAppConfig(saved: AppConfigSlice) {
  Object.assign(config.app, saved);
}

describe('CoreEngine', () => {
  let initAllSpy: jest.SpyInstance;
  const getForgeHealthDetailsMock = getForgeHealthDetails as jest.MockedFunction<typeof getForgeHealthDetails>;

  beforeAll(() => {
    initAllSpy = jest.spyOn(moduleRegistry, 'initializeAll').mockResolvedValue(undefined);
  });

  beforeEach(() => {
    getForgeHealthDetailsMock.mockResolvedValue({
      vaultPath: 'C:/tmp/test-forge-vault.db',
      vaultSignal: 'available',
      lastForgeEventAgeMs: 1234,
      lastForgeEventFresh: true,
    });
    moduleRegistry.registerHealthProbe('forge', async () => {
      const details = await getForgeHealthDetailsMock();
      return details as Record<string, unknown>;
    });
  });

  afterAll(() => {
    initAllSpy.mockRestore();
  });

  it('initialize throws when database check fails', async () => {
    testConnectionMock.mockResolvedValueOnce(false);
    const engine = new CoreEngine();
    await expect(engine.initialize()).rejects.toThrow('Database connection failed');
  });

  describe('with initialized app', () => {
    let engine: CoreEngine;

    beforeAll(async () => {
      testConnectionMock.mockResolvedValue(true);
      engine = new CoreEngine();
      await engine.initialize();
    });

    it('getApp exposes /health', async () => {
      const res = await request(engine.getApp()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.environment).toBeDefined();
      expect(res.body.forge).toMatchObject({
        vaultPath: 'C:/tmp/test-forge-vault.db',
        vaultSignal: 'available',
        lastForgeEventAgeMs: 1234,
        lastForgeEventFresh: true,
      });
    });

    it('getApp /health falls back when forge diagnostics throw', async () => {
      getForgeHealthDetailsMock.mockRejectedValueOnce(new Error('forge unavailable'));
      const res = await request(engine.getApp()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.forge).toEqual({
        vaultPath: null,
        vaultSignal: 'unavailable',
        lastForgeEventAgeMs: null,
        lastForgeEventFresh: null,
      });
    });

    it('getApp exposes /api/v1 module index', async () => {
      const res = await request(engine.getApp()).get('/api/v1');
      expect(res.status).toBe(200);
      expect(res.body.name).toBeDefined();
      expect(Array.isArray(res.body.modules)).toBe(true);
    });

    it('getApp exposes root pointer JSON for browsers', async () => {
      const res = await request(engine.getApp()).get('/');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.links).toMatchObject({
        health: '/health',
        api: '/api/v1',
      });
      expect(res.body.message).toContain('ATINA API backend');
    });

    it('GET /health returns 400 when JSON body is not strictly empty', async () => {
      const res = await request(engine.getApp()).get('/health').send({ x: 1 });
      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('GET /health returns 400 on unknown query params', async () => {
      const res = await request(engine.getApp()).get('/health').query({ extra: '1' });
      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('GET /health is exempt from global rate limiting', async () => {
      const app = engine.getApp();
      for (let i = 0; i < 105; i += 1) {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
      }
    });

    it('GET /api/v1 returns 400 when JSON body is not strictly empty', async () => {
      const res = await request(engine.getApp()).get('/api/v1').send({ x: 1 });
      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for unknown routes', async () => {
      const res = await request(engine.getApp()).get('/no-such-route-xyz');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('request id middleware keeps first X-Request-Id when client sends duplicate header lines', async () => {
      const app = engine.getApp();
      insertBefore404(app, (req: Request, res: Response, next: NextFunction) => {
        if (req.originalUrl === '/__core_dup_rid') {
          res.status(200).json({ id: req.headers['x-request-id'] });
          return;
        }
        next();
      });

      await new Promise<void>((resolve, reject) => {
        const srv = app.listen(0, '127.0.0.1', () => {
          const addr = srv.address() as import('net').AddressInfo;
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port: addr.port,
              path: '/__core_dup_rid',
              method: 'GET',
              headers: {
                'x-request-id': ['dup-client-first', 'dup-client-second'],
              },
            },
            (incoming) => {
              const chunks: Buffer[] = [];
              incoming.on('data', (c) => chunks.push(c));
              incoming.on('end', () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                  expect(body.id).toBe('dup-client-first');
                } catch (e) {
                  reject(e);
                }
                srv.close((err) => (err ? reject(err) : resolve()));
              });
            }
          );
          req.on('error', reject);
          req.end();
        });
        srv.on('error', reject);
      });
    });

    it('error handler maps AppError to response', async () => {
      insertBefore404(engine.getApp(), (req: Request, _res: Response, next: NextFunction) => {
        if (req.originalUrl === '/__core_app_err') return next(new AppError('teapot', 418, 'TEAPOT'));
        next();
      });
      const res = await request(engine.getApp()).get('/__core_app_err');
      expect(res.status).toBe(418);
      expect(res.body.error?.code).toBe('TEAPOT');
    });

    it('error handler masks 5xx AppError messages in non-dev env', async () => {
      const saved = snapshotAppConfig();
      Object.assign(config.app, { isDev: false, isProd: true });
      try {
        insertBefore404(engine.getApp(), (req: Request, _res: Response, next: NextFunction) => {
          if (req.originalUrl.startsWith('/__core_masked_app_500')) {
            return next(new AppError('db internal failure', 500, 'DB_FAILURE'));
          }
          next();
        });
        const res = await request(engine.getApp()).get('/__core_masked_app_500');
        expect(res.status).toBe(500);
        expect(res.body.error?.code).toBe('DB_FAILURE');
        expect(res.body.error?.message).toBe('Internal server error');
      } finally {
        restoreAppConfig(saved);
      }
    });

    it('error handler keeps 4xx AppError message in non-dev env', async () => {
      const saved = snapshotAppConfig();
      Object.assign(config.app, { isDev: false, isProd: true });
      try {
        insertBefore404(engine.getApp(), (req: Request, _res: Response, next: NextFunction) => {
          if (req.originalUrl.startsWith('/__core_app_4xx')) {
            return next(new AppError('bad input', 400, 'BAD_INPUT'));
          }
          next();
        });
        const res = await request(engine.getApp()).get('/__core_app_4xx');
        expect(res.status).toBe(400);
        expect(res.body.error?.code).toBe('BAD_INPUT');
        expect(res.body.error?.message).toBe('bad input');
      } finally {
        restoreAppConfig(saved);
      }
    });

    it('error handler forwards AppError details', async () => {
      insertBefore404(engine.getApp(), (req: Request, _res: Response, next: NextFunction) => {
        if (req.originalUrl.startsWith('/__core_app_err_details')) {
          return next(new AppError('with details', 422, 'UNPROCESSABLE', { field: 'x' }));
        }
        next();
      });
      const res = await request(engine.getApp()).get('/__core_app_err_details');
      expect(res.status).toBe(422);
      expect(res.body.error?.details).toEqual({ field: 'x' });
    });

    it('error handler maps generic Error in development', async () => {
      insertBefore404(engine.getApp(), (req: Request, _res: Response, next: NextFunction) => {
        if (req.originalUrl.startsWith('/__core_gen_err')) return next(new Error('visible-msg'));
        next();
      });
      const res = await request(engine.getApp()).get('/__core_gen_err');
      expect(res.status).toBe(500);
      expect(res.body.error?.code).toBe('INTERNAL_ERROR');
      expect(res.body.error?.message).toBe(
        config.app.isDev ? 'visible-msg' : 'Internal server error'
      );
    });

    it('start invokes listen callback and captures signal handlers', async () => {
      const listenSpy = jest.spyOn(express.application, 'listen').mockImplementation(function (
        this: express.Application,
        ...args: unknown[]
      ) {
        let cb: (() => void) | undefined;
        if (typeof args[0] === 'number' && typeof args[1] === 'function') {
          cb = args[1] as () => void;
        } else if (typeof args[0] === 'function') {
          cb = args[0] as () => void;
        }
        setImmediate(() => cb?.());
        return {
          close: (fn?: (err?: Error) => void) => {
            fn?.();
          },
        } as ReturnType<express.Application['listen']>;
      });

      let onSigterm: (() => void) | undefined;
      let onSigint: (() => void) | undefined;
      const onSpy = jest.spyOn(process, 'on').mockImplementation((ev, fn) => {
        if (ev === 'SIGTERM') onSigterm = fn as () => void;
        if (ev === 'SIGINT') onSigint = fn as () => void;
        return process;
      });

      const e = new CoreEngine();
      await e.initialize();
      await e.start();

      expect(listenSpy).toHaveBeenCalled();
      expect(onSigterm).toBeDefined();
      expect(onSigint).toBeDefined();

      listenSpy.mockRestore();
      onSpy.mockRestore();
    });

    it('SIGTERM shutdown closes server and exits 0', async () => {
      const shutdownSpy = jest.spyOn(moduleRegistry, 'shutdownAll').mockResolvedValue(undefined);
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      const listenSpy = jest.spyOn(express.application, 'listen').mockImplementation(function (
        this: express.Application,
        ...args: unknown[]
      ) {
        let cb: (() => void) | undefined;
        if (typeof args[0] === 'number' && typeof args[1] === 'function') {
          cb = args[1] as () => void;
        }
        setImmediate(() => cb?.());
        return {
          close: (fn?: (err?: Error) => void) => {
            void Promise.resolve().then(() => fn?.());
          },
        } as ReturnType<express.Application['listen']>;
      });

      let onSigterm: (() => void) | undefined;
      const onSpy = jest.spyOn(process, 'on').mockImplementation((ev, fn) => {
        if (ev === 'SIGTERM') onSigterm = fn as () => void;
        return process;
      });

      const e = new CoreEngine();
      await e.initialize();
      await e.start();

      onSigterm?.();
      await new Promise<void>((r) => setImmediate(r));
      await new Promise<void>((r) => setImmediate(r));

      expect(shutdownSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(0);

      listenSpy.mockRestore();
      onSpy.mockRestore();
      shutdownSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('SIGINT shutdown closes server and exits 0', async () => {
      const shutdownSpy = jest.spyOn(moduleRegistry, 'shutdownAll').mockResolvedValue(undefined);
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      const listenSpy = jest.spyOn(express.application, 'listen').mockImplementation(function (
        this: express.Application,
        ...args: unknown[]
      ) {
        let cb: (() => void) | undefined;
        if (typeof args[0] === 'number' && typeof args[1] === 'function') {
          cb = args[1] as () => void;
        }
        setImmediate(() => cb?.());
        return {
          close: (fn?: (err?: Error) => void) => {
            void Promise.resolve().then(() => fn?.());
          },
        } as ReturnType<express.Application['listen']>;
      });

      let onSigint: (() => void) | undefined;
      const onSpy = jest.spyOn(process, 'on').mockImplementation((ev, fn) => {
        if (ev === 'SIGINT') onSigint = fn as () => void;
        return process;
      });

      const e = new CoreEngine();
      await e.initialize();
      await e.start();

      onSigint?.();
      await new Promise<void>((r) => setImmediate(r));
      await new Promise<void>((r) => setImmediate(r));

      expect(shutdownSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(0);

      listenSpy.mockRestore();
      onSpy.mockRestore();
      shutdownSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('forced shutdown after close timeout exits 1', async () => {
      jest.useFakeTimers({ advanceTimers: true });
      try {
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

        const listenSpy = jest.spyOn(express.application, 'listen').mockImplementation(function (
          this: express.Application,
          ...args: unknown[]
        ) {
          let cb: (() => void) | undefined;
          if (typeof args[0] === 'number' && typeof args[1] === 'function') {
            cb = args[1] as () => void;
          }
          queueMicrotask(() => cb?.());
          return {
            close: (_fn?: (err?: Error) => void) => {
              /* never invoke — triggers forced shutdown */
            },
          } as ReturnType<express.Application['listen']>;
        });

        let onSigterm: (() => void) | undefined;
        const onSpy = jest.spyOn(process, 'on').mockImplementation((ev, fn) => {
          if (ev === 'SIGTERM') onSigterm = fn as () => void;
          return process;
        });

        const e = new CoreEngine();
        await e.initialize();
        await e.start();

        await Promise.resolve();
        onSigterm?.();
        jest.advanceTimersByTime(10001);
        await Promise.resolve();

        expect(exitSpy).toHaveBeenCalledWith(1);

        listenSpy.mockRestore();
        onSpy.mockRestore();
        exitSpy.mockRestore();
      } finally {
        jest.clearAllTimers();
        jest.useRealTimers();
      }
    });
  });

  describe('with patched app config', () => {
    it('production: fixed CORS origin, helmet CSP, combined morgan branch', async () => {
      const saved = snapshotAppConfig();
      Object.assign(config.app, {
        isDev: false,
        isProd: true,
        url: 'https://app.prod.test',
        env: 'production',
      });
      try {
        testConnectionMock.mockResolvedValue(true);
        const e = new CoreEngine();
        await e.initialize();
        const res = await request(e.getApp()).get('/health').set('Origin', 'https://app.prod.test');
        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBe('https://app.prod.test');
        expect(res.headers['content-security-policy']).toBeDefined();
      } finally {
        restoreAppConfig(saved);
      }
    });

    it('isDev true: generic error response includes message', async () => {
      const saved = snapshotAppConfig();
      Object.assign(config.app, { isDev: true, isProd: false });
      try {
        testConnectionMock.mockResolvedValue(true);
        const e = new CoreEngine();
        await e.initialize();
        insertBefore404(e.getApp(), (req: Request, _res: Response, next: NextFunction) => {
          if (req.originalUrl.startsWith('/__raw_err')) return next(new Error('raw-detail'));
          next();
        });
        const res = await request(e.getApp()).get('/__raw_err');
        expect(res.status).toBe(500);
        expect(res.body.error?.message).toBe('raw-detail');
      } finally {
        restoreAppConfig(saved);
      }
    });
  });

  it('shutdown without listen does not throw', async () => {
    testConnectionMock.mockResolvedValue(true);
    const e = new CoreEngine();
    await e.initialize();
    await (e as unknown as { shutdown: (s: string) => Promise<void> }).shutdown('SIGTERM');
    expect(logger.info).toHaveBeenCalledWith('Received SIGTERM. Graceful shutdown...');
  });

  describe('feature flag registration', () => {
    it('omits automation and scraper when both features disabled', async () => {
      const saved = {
        automation: config.features.automation,
        scraper: config.features.scraper,
      };
      Object.assign(config.features, { automation: false, scraper: false });
      try {
        moduleRegistry.resetForTests();
        testConnectionMock.mockResolvedValue(true);
        const e = new CoreEngine();
        await e.initialize();
        expect(moduleRegistry.isRegistered('automation')).toBe(false);
        expect(moduleRegistry.isRegistered('scraper')).toBe(false);
      } finally {
        Object.assign(config.features, saved);
        moduleRegistry.resetForTests();
        testConnectionMock.mockResolvedValue(true);
        await new CoreEngine().initialize();
      }
    });

    it('registers automation only when automation enabled and scraper disabled', async () => {
      const saved = {
        automation: config.features.automation,
        scraper: config.features.scraper,
      };
      Object.assign(config.features, { automation: true, scraper: false });
      try {
        moduleRegistry.resetForTests();
        testConnectionMock.mockResolvedValue(true);
        await new CoreEngine().initialize();
        expect(moduleRegistry.isRegistered('automation')).toBe(true);
        expect(moduleRegistry.isRegistered('scraper')).toBe(false);
      } finally {
        Object.assign(config.features, saved);
        moduleRegistry.resetForTests();
        testConnectionMock.mockResolvedValue(true);
        await new CoreEngine().initialize();
      }
    });

    it('registers scraper only when scraper enabled and automation disabled', async () => {
      const saved = {
        automation: config.features.automation,
        scraper: config.features.scraper,
      };
      Object.assign(config.features, { automation: false, scraper: true });
      try {
        moduleRegistry.resetForTests();
        testConnectionMock.mockResolvedValue(true);
        await new CoreEngine().initialize();
        expect(moduleRegistry.isRegistered('automation')).toBe(false);
        expect(moduleRegistry.isRegistered('scraper')).toBe(true);
      } finally {
        Object.assign(config.features, saved);
        moduleRegistry.resetForTests();
        testConnectionMock.mockResolvedValue(true);
        await new CoreEngine().initialize();
      }
    });

    it('omits crm and analytics when both features disabled', async () => {
      const saved = {
        crm: config.features.crm,
        analytics: config.features.analytics,
        automation: config.features.automation,
        scraper: config.features.scraper,
      };
      Object.assign(config.features, { crm: false, analytics: false, automation: true, scraper: true });
      try {
        moduleRegistry.resetForTests();
        testConnectionMock.mockResolvedValue(true);
        await new CoreEngine().initialize();
        expect(moduleRegistry.isRegistered('crm')).toBe(false);
        expect(moduleRegistry.isRegistered('analytics')).toBe(false);
      } finally {
        Object.assign(config.features, saved);
        moduleRegistry.resetForTests();
        testConnectionMock.mockResolvedValue(true);
        await new CoreEngine().initialize();
      }
    });

    it('omits crm when crm disabled but analytics enabled', async () => {
      const saved = {
        crm: config.features.crm,
        analytics: config.features.analytics,
        automation: config.features.automation,
        scraper: config.features.scraper,
      };
      Object.assign(config.features, { crm: false, analytics: true, automation: true, scraper: true });
      try {
        moduleRegistry.resetForTests();
        testConnectionMock.mockResolvedValue(true);
        await new CoreEngine().initialize();
        expect(moduleRegistry.isRegistered('crm')).toBe(false);
        expect(moduleRegistry.isRegistered('analytics')).toBe(true);
      } finally {
        Object.assign(config.features, saved);
        moduleRegistry.resetForTests();
        testConnectionMock.mockResolvedValue(true);
        await new CoreEngine().initialize();
      }
    });

    it('omits analytics when analytics disabled but crm enabled', async () => {
      const saved = {
        crm: config.features.crm,
        analytics: config.features.analytics,
        automation: config.features.automation,
        scraper: config.features.scraper,
      };
      Object.assign(config.features, { crm: true, analytics: false, automation: true, scraper: true });
      try {
        moduleRegistry.resetForTests();
        testConnectionMock.mockResolvedValue(true);
        await new CoreEngine().initialize();
        expect(moduleRegistry.isRegistered('crm')).toBe(true);
        expect(moduleRegistry.isRegistered('analytics')).toBe(false);
      } finally {
        Object.assign(config.features, saved);
        moduleRegistry.resetForTests();
        testConnectionMock.mockResolvedValue(true);
        await new CoreEngine().initialize();
      }
    });
  });
});
