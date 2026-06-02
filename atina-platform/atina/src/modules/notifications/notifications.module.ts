import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { NotificationsController } from './controller/notifications.controller';
import {
  NotificationIdParamsDto,
  NotificationsListQueryDto,
} from './dto/notifications.dto';
import { NotificationsService } from './service/notifications.service';

export class NotificationsModule implements IModule {
  name = 'Notifications';
  slug = 'notifications';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private service!: NotificationsService;
  private controller!: NotificationsController;

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.service = new NotificationsService();
    this.controller = new NotificationsController(this.service);
    this.service.verifySmtpIfConfigured();

    this.router.get(
      '/',
      authenticate,
      validateQuery(NotificationsListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.patch(
      '/:id/read',
      authenticate,
      validateParams(NotificationIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.markRead
    );
    this.router.patch(
      '/read-all',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.markAllRead
    );
    this.router.delete(
      '/:id',
      authenticate,
      validateParams(NotificationIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.deleteNotification
    );
    this.router.get(
      '/unread-count',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.unreadCount
    );
  }

  private ensureService(): NotificationsService {
    if (!this.service) this.service = new NotificationsService();
    return this.service;
  }

  createNotification(data: Parameters<NotificationsService['createNotification']>[0]) {
    return this.ensureService().createNotification(data);
  }

  sendEmail(to: string, subject: string, html: string, text?: string) {
    return this.ensureService().sendEmail(to, subject, html, text);
  }
}
