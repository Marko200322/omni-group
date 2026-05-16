import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let moduleRef: TestingModule;
  let controller: NotificationsController;
  let notifications: jest.Mocked<Pick<NotificationsService, 'health'>>;

  beforeEach(async () => {
    notifications = { health: jest.fn() };

    moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: notifications }],
    }).compile();

    controller = moduleRef.get(NotificationsController);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('GET notifications/health proxies to notifications.health()', async () => {
    const payload = { ok: true as const, transport: 'logger-stub' as const };
    notifications.health.mockReturnValue(payload);

    const result = await controller.health();

    expect(notifications.health).toHaveBeenCalled();
    expect(result).toBe(payload);
  });
});
