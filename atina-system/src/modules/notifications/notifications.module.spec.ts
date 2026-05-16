import { Injectable, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsModule } from './notifications.module';
import { NotificationsService } from './notifications.service';

@Injectable()
class NotificationsProbe {
  constructor(readonly notifications: NotificationsService) {}
}

@Module({
  imports: [NotificationsModule],
  providers: [NotificationsProbe],
})
class ConsumerModule {}

describe('NotificationsModule', () => {
  let moduleRef: TestingModule | undefined;

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
      moduleRef = undefined;
    }
  });

  it('provides and exports NotificationsService', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [NotificationsModule],
    }).compile();

    const service = moduleRef.get(NotificationsService);
    const notificationsController = moduleRef.get(NotificationsController);

    expect(service).toBeInstanceOf(NotificationsService);
    expect(notificationsController).toBeInstanceOf(NotificationsController);
  });

  it('exposes NotificationsService to providers in an importing module', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConsumerModule],
    }).compile();

    const probe = moduleRef.get(NotificationsProbe);

    expect(probe.notifications).toBeInstanceOf(NotificationsService);
  });
});