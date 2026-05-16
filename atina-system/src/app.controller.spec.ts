import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { AppController } from './app.controller';
import { HealthService } from './health/health.service';
import { resetInternalQueueSmokeRateLimitForTests } from './internal/assert-internal-queue-smoke-rate-limit';
import { SystemQueueService } from './queue/system-queue.service';

function queueSmokeReq(overrides: Partial<Request> = {}): Request {
  return {
    ip: '127.0.0.1',
    headers: {},
    socket: { remoteAddress: '127.0.0.1' } as Request['socket'],
    ...overrides,
  } as Request;
}

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    delete process.env.REDIS_HOST;
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [HealthService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return ok', async () => {
      const body = (await appController.health()) as {
        ok: boolean;
        redis: { configured: boolean };
        bull: { enabled: boolean; queues: string[] };
      };
      expect(body.ok).toBe(true);
      expect(body.redis.configured).toBe(false);
      expect(body.bull).toEqual({ enabled: false, queues: [] });
    });
  });

  describe('enqueueQueueSmoke', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevInternalKey = process.env.INTERNAL_QUEUE_SMOKE_KEY;

    beforeEach(() => {
      resetInternalQueueSmokeRateLimitForTests();
    });

    afterEach(() => {
      process.env.NODE_ENV = prevNodeEnv;
      if (prevInternalKey === undefined) {
        delete process.env.INTERNAL_QUEUE_SMOKE_KEY;
      } else {
        process.env.INTERNAL_QUEUE_SMOKE_KEY = prevInternalKey;
      }
    });

    it('throws NotFoundException in production', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.INTERNAL_QUEUE_SMOKE_KEY;
      const app: TestingModule = await Test.createTestingModule({
        controllers: [AppController],
        providers: [HealthService],
      }).compile();
      const c = app.get<AppController>(AppController);
      await expect(c.enqueueQueueSmoke(queueSmokeReq())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns bull false when Bull is not configured', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.INTERNAL_QUEUE_SMOKE_KEY;
      const app: TestingModule = await Test.createTestingModule({
        controllers: [AppController],
        providers: [HealthService],
      }).compile();
      const c = app.get<AppController>(AppController);
      await expect(c.enqueueQueueSmoke(queueSmokeReq())).resolves.toEqual({
        bull: false,
        message: 'Set REDIS_HOST to enable BullMQ',
      });
    });

    it('returns Forbidden when INTERNAL_QUEUE_SMOKE_KEY set and header arg missing', async () => {
      process.env.NODE_ENV = 'development';
      process.env.INTERNAL_QUEUE_SMOKE_KEY = 'gate-secret';
      const app: TestingModule = await Test.createTestingModule({
        controllers: [AppController],
        providers: [HealthService],
      }).compile();
      const c = app.get<AppController>(AppController);
      await expect(c.enqueueQueueSmoke(queueSmokeReq())).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows smoke when key matches', async () => {
      process.env.NODE_ENV = 'development';
      process.env.INTERNAL_QUEUE_SMOKE_KEY = 'gate-secret';
      const app: TestingModule = await Test.createTestingModule({
        controllers: [AppController],
        providers: [HealthService],
      }).compile();
      const c = app.get<AppController>(AppController);
      await expect(
        c.enqueueQueueSmoke(queueSmokeReq(), 'gate-secret'),
      ).resolves.toEqual({
        bull: false,
        message: 'Set REDIS_HOST to enable BullMQ',
      });
    });

    it('enqueues when SystemQueueService is present', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.INTERNAL_QUEUE_SMOKE_KEY;
      const mockSvc = {
        enqueueSmokeJob: jest.fn().mockResolvedValue({ jobId: 'jid-1' }),
      };
      const app: TestingModule = await Test.createTestingModule({
        controllers: [AppController],
        providers: [
          HealthService,
          { provide: SystemQueueService, useValue: mockSvc },
        ],
      }).compile();
      const c = app.get<AppController>(AppController);
      await expect(c.enqueueQueueSmoke(queueSmokeReq())).resolves.toEqual({
        bull: true,
        queue: 'system',
        jobId: 'jid-1',
      });
      expect(mockSvc.enqueueSmokeJob).toHaveBeenCalled();
    });
  });
});
