import { Router } from 'express';
import { z } from 'zod';
import { IModule } from '../../core/ModuleRegistry';
import { VideoMeetingsController } from './controller/video-meetings.controller';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { authSessionLimiter, paymentsLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import {
  BookMeetingDto,
  ConfirmMeetingDto,
  MeetingIdParamsDto,
  AvatarChatDto,
  AvatarSessionParamsDto,
  StartAvatarSessionDto,
} from './dto/video-meetings.dto';

export class VideoMeetingsModule implements IModule {
  name = 'Video Meetings';
  slug = 'video-meetings';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new VideoMeetingsController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    const auth = [authenticate, authSessionLimiter];

    // Support (prioritet)
    this.router.get('/support/agents', validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.getSupportAgents);
    this.router.get('/support/methods', validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.getSupportMethods);
    this.router.post(
      '/support/book',
      paymentsLimiter,
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(BookMeetingDto),
      this.controller.bookSupport
    );
    this.router.get(
      '/support/mine',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listMySupport
    );
    this.router.post(
      '/support/confirm/:id',
      paymentsLimiter,
      ...auth,
      requireAdmin,
      validateParams(MeetingIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(ConfirmMeetingDto),
      this.controller.confirmSupport
    );

    this.router.post(
      '/support/avatar/session',
      paymentsLimiter,
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StartAvatarSessionDto),
      this.controller.startSupportAvatarSession
    );
    this.router.post(
      '/support/avatar/chat',
      paymentsLimiter,
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(AvatarChatDto),
      this.controller.chatSupportAvatar
    );
    this.router.get(
      '/support/avatar/session/:sessionId/history',
      ...auth,
      validateParams(AvatarSessionParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.historySupportAvatar
    );

    // Prodaja (faza 2 — booking zahteva SALES_MEETINGS_ENABLED=true; avatar uvek ako SALES_AVATAR_ENABLED)
    this.router.get('/sales/agents', validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.getSalesAgents);
    this.router.get('/sales/methods', validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.getSalesMethods);
    this.router.post(
      '/sales/book',
      paymentsLimiter,
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(BookMeetingDto),
      this.controller.bookSales
    );
    this.router.post(
      '/sales/avatar/session',
      paymentsLimiter,
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StartAvatarSessionDto),
      this.controller.startSalesAvatarSession
    );
    this.router.post(
      '/sales/avatar/chat',
      paymentsLimiter,
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(AvatarChatDto),
      this.controller.chatSalesAvatar
    );
    this.router.get(
      '/sales/avatar/session/:sessionId/history',
      ...auth,
      validateParams(AvatarSessionParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.historySalesAvatar
    );
  }
}
