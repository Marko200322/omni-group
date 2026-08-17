import { Request, Response } from 'express';
import { VideoMeetingsService } from '../service/video-meetings.service';
import { AvatarAgentService } from '../service/avatar-agent.service';
import { sendCreated, sendSuccess } from '../../../utils/response';

export class VideoMeetingsController {
  private readonly service = new VideoMeetingsService();
  private readonly avatarService = new AvatarAgentService();

  getAvatarMediaStack = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.avatarService.mediaStack());
  };

  getSupportAgents = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getAgents('support'));
  };

  getSupportMethods = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.service.getMethods('support'));
  };

  bookSupport = async (req: Request, res: Response): Promise<void> => {
    const meeting = await this.service.book(req.user!.userId, 'support', req.body);
    sendCreated(res, meeting, 'Support meeting request created');
  };

  listMySupport = async (req: Request, res: Response): Promise<void> => {
    const meetings = await this.service.listMine(req.user!.userId, 'support');
    sendSuccess(res, meetings);
  };

  confirmSupport = async (req: Request, res: Response): Promise<void> => {
    const meeting = await this.service.confirmSupportMeeting(
      req.params.id,
      req.user!.userId,
      req.body
    );
    sendSuccess(res, meeting, 'Support meeting scheduled');
  };

  getSalesAgents = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getAgents('sales'));
  };

  getSalesMethods = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.service.getMethods('sales'));
  };

  bookSales = async (req: Request, res: Response): Promise<void> => {
    const meeting = await this.service.book(req.user!.userId, 'sales', req.body);
    sendCreated(res, meeting, 'Sales meeting request created');
  };

  startSupportAvatarSession = async (req: Request, res: Response): Promise<void> => {
    const session = await this.avatarService.startSession(
      req.user!.userId,
      'support',
      req.body?.agentId
    );
    sendCreated(res, session, 'Support avatar session started');
  };

  startPublicAvatarSession = async (req: Request, res: Response): Promise<void> => {
    const session = await this.avatarService.startGuestSession(req.body?.agentId);
    sendCreated(res, session, 'Public assistant session started');
  };

  chatPublicAvatar = async (req: Request, res: Response): Promise<void> => {
    const result = await this.avatarService.chatGuest(req.body.sessionId, req.body.message);
    sendSuccess(res, result);
  };

  chatSupportAvatar = async (req: Request, res: Response): Promise<void> => {
    const result = await this.avatarService.chat(
      req.user!.userId,
      'support',
      req.body.sessionId,
      req.body.message
    );
    sendSuccess(res, result);
  };

  historySupportAvatar = async (req: Request, res: Response): Promise<void> => {
    const history = await this.avatarService.getHistory(
      req.user!.userId,
      'support',
      req.params.sessionId
    );
    sendSuccess(res, history);
  };

  startSalesAvatarSession = async (req: Request, res: Response): Promise<void> => {
    const session = await this.avatarService.startSession(
      req.user!.userId,
      'sales',
      req.body?.agentId
    );
    sendCreated(res, session, 'Sales avatar session started');
  };

  chatSalesAvatar = async (req: Request, res: Response): Promise<void> => {
    const result = await this.avatarService.chat(
      req.user!.userId,
      'sales',
      req.body.sessionId,
      req.body.message
    );
    sendSuccess(res, result);
  };

  historySalesAvatar = async (req: Request, res: Response): Promise<void> => {
    const history = await this.avatarService.getHistory(
      req.user!.userId,
      'sales',
      req.params.sessionId
    );
    sendSuccess(res, history);
  };
}
