import { Controller, Get } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

/** Ops / blueprint ruta — bez spoljnog transporta (vidi servis). */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('health')
  health() {
    return this.notifications.health();
  }
}
