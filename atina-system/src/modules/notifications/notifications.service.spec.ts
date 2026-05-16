import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let moduleRef: TestingModule;
  let service: NotificationsService;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [NotificationsService],
    }).compile();

    service = moduleRef.get(NotificationsService);
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(async () => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    await moduleRef.close();
  });

  describe('health', () => {
    it('returns stub transport metadata', () => {
      expect(service.health()).toEqual({
        ok: true,
        transport: 'logger-stub',
      });
    });
  });

  describe('sendInfo', () => {
    it('logs the prefixed message', () => {
      service.sendInfo('pipeline ok');

      expect(logSpy).toHaveBeenCalledWith('[notify:info] pipeline ok');
    });
  });

  describe('sendWarn', () => {
    it('logs a warn-level prefixed message', () => {
      service.sendWarn('quota 80%');

      expect(warnSpy).toHaveBeenCalledWith('[notify:warn] quota 80%');
    });
  });

  describe('sendError', () => {
    it('logs an error-level prefixed message', () => {
      service.sendError('webhook failed');

      expect(errorSpy).toHaveBeenCalledWith('[notify:error] webhook failed');
    });
  });
});