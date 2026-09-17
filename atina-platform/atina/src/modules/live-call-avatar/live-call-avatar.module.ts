import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter, paymentsLimiter, webhookLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { LiveCallAvatarController } from './controller/live-call-avatar.controller';
import {
  BookLiveMeetingDto,
  LiveCallSessionParamsDto,
  LiveCallTurnDto,
  StartLiveCallSessionDto,
} from './dto/live-call.dto';

export class LiveCallAvatarModule implements IModule {
  name = 'Live Call Avatar';
  slug = 'live-call-avatar';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new LiveCallAvatarController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    const auth = [authenticate, authSessionLimiter];

    this.router.get(
      '/status',
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getStatus,
    );

    this.router.post(
      '/session',
      paymentsLimiter,
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StartLiveCallSessionDto),
      this.controller.startSession,
    );

    this.router.get(
      '/session/:sessionId',
      ...auth,
      validateParams(LiveCallSessionParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getSession,
    );

    this.router.post(
      '/session/:sessionId/turn',
      paymentsLimiter,
      ...auth,
      validateParams(LiveCallSessionParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(LiveCallTurnDto),
      this.controller.processTurn,
    );

    this.router.post(
      '/session/:sessionId/end',
      ...auth,
      validateParams(LiveCallSessionParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.endSession,
    );

    this.router.post(
      '/session/:sessionId/handoff',
      ...auth,
      validateParams(LiveCallSessionParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.requestHandoff,
    );

    this.router.post(
      '/book',
      paymentsLimiter,
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(BookLiveMeetingDto),
      this.controller.bookMeeting,
    );

    this.router.post('/recall/webhook', webhookLimiter, this.controller.recallWebhook);
  }
}
