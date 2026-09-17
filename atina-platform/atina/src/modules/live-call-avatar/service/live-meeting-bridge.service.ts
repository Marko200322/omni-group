import { config } from '../../../config';
import { ValidationError } from '../../../utils/errors';
import { createZoomMeeting, isZoomConfigured } from '../../video-meetings/providers/zoom-meeting.provider';
import {
  isGoogleMeetConfigured,
  resolveGoogleMeetRoom,
} from '../../video-meetings/providers/google-meet.provider';
import { VideoMeetingsRepository } from '../../video-meetings/repository/video-meetings.repository';
import { MeetingNotificationsService } from '../../video-meetings/service/meeting-notifications.service';
import { createRecallBot, isRecallConfigured, stopRecallBot } from '../providers/recall-bot.provider';
import { LiveSessionOrchestratorService } from './live-session-orchestrator.service';
import { LiveCallSessionsRepository } from '../repository/live-sessions.repository';
import type { BookLiveMeetingDtoType } from '../dto/live-call.dto';
import type { AgentType } from '../../video-meetings/avatar/avatar-agent.personas';
import logger from '../../../utils/logger';

export class LiveMeetingBridgeService {
  private readonly meetings = new VideoMeetingsRepository();
  private readonly notify = new MeetingNotificationsService();
  private readonly orchestrator = new LiveSessionOrchestratorService();
  private readonly liveRepo = new LiveCallSessionsRepository();

  async bookAiAvatarMeeting(userId: string, dto: BookLiveMeetingDtoType) {
    this.orchestrator.assertEnabled();

    const meetingType = dto.agentType as AgentType;
    const duration = dto.durationMinutes ?? config.videoMeetings.defaultDurationMinutes;
    const scheduledAt = dto.scheduledAt
      ? new Date(dto.scheduledAt)
      : new Date(Date.now() + 5 * 60 * 1000);
    if (Number.isNaN(scheduledAt.getTime())) throw new ValidationError('scheduledAt is invalid');

    let provider = dto.provider;
    if (provider === 'zoom' && !isZoomConfigured()) {
      throw new ValidationError('Zoom is not configured for live avatar meetings');
    }
    if (provider === 'google_meet' && !isGoogleMeetConfigured(meetingType)) {
      throw new ValidationError('Google Meet is not configured for live avatar meetings');
    }

    let meetingUrl: string | null = null;
    let externalMeetingId: string | null = null;

    if (provider === 'google_meet') {
      const room = resolveGoogleMeetRoom(meetingType);
      if (!room) throw new ValidationError('Google Meet room unavailable');
      meetingUrl = room.meetingUrl;
      externalMeetingId = room.externalMeetingId;
    } else {
      const zoom = await createZoomMeeting({
        topic: dto.topic,
        startTime: scheduledAt,
        durationMinutes: duration,
        agenda: dto.description,
      });
      meetingUrl = zoom.meetingUrl;
      externalMeetingId = zoom.externalMeetingId;
    }

    const agentProfile =
      meetingType === 'support' ? config.videoMeetings.support : config.videoMeetings.sales;

    const { rows: meetingRows } = await this.meetings.insertRequest({
      userId,
      meetingType,
      provider,
      status: 'scheduled',
      topic: dto.topic,
      description: dto.description ?? null,
      scheduledAt,
      durationMinutes: duration,
      meetingUrl,
      externalMeetingId,
      agentName: agentProfile.agentName,
      agentAvatarUrl: agentProfile.agentAvatarUrl,
      metadata: {
        hostType: 'ai_avatar',
        liveProvider: dto.liveProvider,
        agentId: dto.agentId ?? 'mila',
        scheduledAt: scheduledAt.toISOString(),
      },
    });
    const meeting = meetingRows[0];

    const liveSession = await this.orchestrator.startSession(userId, {
      agentId: dto.agentId ?? 'mila',
      agentType: dto.agentType,
      platform: provider,
      liveProvider: dto.liveProvider,
      meetingRequestId: meeting.id,
      meetingUrl: meetingUrl ?? undefined,
    });

    let recallBotId: string | null = null;
    if (isRecallConfigured() && meetingUrl) {
      try {
        const bot = await createRecallBot({
          meetingUrl,
          botName: agentProfile.agentName || 'Mila',
          webhookUrl: config.liveCallAvatar.recallWebhookUrl || undefined,
          metadata: {
            liveSessionId: liveSession.sessionId,
            meetingRequestId: meeting.id,
            userId,
          },
        });
        recallBotId = bot.botId;
        await this.liveRepo.updateRecallBot(liveSession.sessionId, recallBotId);
      } catch (err) {
        logger.warn('Recall bot create failed — meeting still scheduled', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const { rows: userRows } = await this.meetings.getUserContact(userId);
    const user = userRows[0];
    if (user?.email && meetingUrl) {
      this.notify.dispatch(
        this.notify.sendMeetingScheduledToClient({
          toEmail: user.email,
          toName: user.name,
          meetingType,
          topic: dto.topic,
          agentName: agentProfile.agentName,
          agentAvatarUrl: agentProfile.agentAvatarUrl,
          provider,
          meetingUrl,
          scheduledAt: scheduledAt.toISOString(),
          durationMinutes: duration,
        }),
        'live_avatar_scheduled',
      );
    }

    return {
      meeting,
      liveSession,
      recallBotId,
      joinUrl: meetingUrl,
    };
  }

  async stopRecallForSession(recallBotId: string | null | undefined): Promise<void> {
    if (!recallBotId) return;
    await stopRecallBot(recallBotId);
  }
}
