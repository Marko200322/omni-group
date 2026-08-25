import { Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { sendCreated, sendSuccess, sendError } from '../../../utils/response';
import { config } from '../../../config';
import { LiveSessionOrchestratorService } from '../service/live-session-orchestrator.service';
import { LiveMeetingBridgeService } from '../service/live-meeting-bridge.service';
import { RecallWebhookService } from '../service/recall-webhook.service';

function recallWebhookAuthorized(req: Request, secret: string): boolean {
  const header =
    String(req.headers['x-recall-webhook-secret'] ?? req.headers['webhook-secret'] ?? '') ||
    (typeof req.headers.authorization === 'string' && req.headers.authorization.toLowerCase().startsWith('bearer ')
      ? req.headers.authorization.slice(7).trim()
      : '');
  const got = Buffer.from(header);
  const expected = Buffer.from(secret);
  if (got.length !== expected.length) return false;
  return timingSafeEqual(got, expected);
}

export class LiveCallAvatarController {
  private readonly orchestrator = new LiveSessionOrchestratorService();
  private readonly bridge = new LiveMeetingBridgeService();
  private readonly recallWebhookService = new RecallWebhookService();

  getStatus = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.orchestrator.getProviderStatus());
  };

  startSession = async (req: Request, res: Response): Promise<void> => {
    const session = await this.orchestrator.startSession(req.user!.userId, req.body);
    sendCreated(res, session, 'Live call session started');
  };

  processTurn = async (req: Request, res: Response): Promise<void> => {
    const result = await this.orchestrator.processTurn(
      req.user!.userId,
      req.params.sessionId,
      req.body,
    );
    sendSuccess(res, result);
  };

  getSession = async (req: Request, res: Response): Promise<void> => {
    const session = await this.orchestrator.getSession(req.user!.userId, req.params.sessionId);
    sendSuccess(res, session);
  };

  endSession = async (req: Request, res: Response): Promise<void> => {
    const result = await this.orchestrator.endSession(req.user!.userId, req.params.sessionId);
    sendSuccess(res, result, 'Live call session ended');
  };

  requestHandoff = async (req: Request, res: Response): Promise<void> => {
    const result = await this.orchestrator.requestHandoff(req.user!.userId, req.params.sessionId);
    sendSuccess(res, result, 'Human handoff requested');
  };

  bookMeeting = async (req: Request, res: Response): Promise<void> => {
    const result = await this.bridge.bookAiAvatarMeeting(req.user!.userId, req.body);
    sendCreated(res, result, 'AI avatar meeting scheduled');
  };

  recallWebhook = async (req: Request, res: Response): Promise<void> => {
    const secret = config.liveCallAvatar.recallWebhookSecret.trim();
    if (secret && !recallWebhookAuthorized(req, secret)) {
      sendError(res, 'Invalid webhook signature', 401, 'WEBHOOK_UNAUTHORIZED');
      return;
    }
    const result = await this.recallWebhookService.handle((req.body ?? {}) as Record<string, unknown>);
    sendSuccess(res, result);
  };
}
