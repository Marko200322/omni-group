import { config } from '../../../config';
import { NotFoundError, ConflictError, ValidationError } from '../../../utils/errors';
import { VideoMeetingsRepository } from '../repository/video-meetings.repository';
import { MeetingNotificationsService } from './meeting-notifications.service';
import type { BookMeetingDtoType, ConfirmMeetingDtoType } from '../dto/video-meetings.dto';
import { createZoomMeeting, isZoomConfigured } from '../providers/zoom-meeting.provider';
import {
  isGoogleMeetConfigured,
  resolveGoogleMeetRoom,
} from '../providers/google-meet.provider';
import logger from '../../../utils/logger';
import { AvatarAgentService } from './avatar-agent.service';

type MeetingType = 'support' | 'sales';

export class VideoMeetingsService {
  private readonly repo = new VideoMeetingsRepository();
  private readonly notify = new MeetingNotificationsService();
  private readonly avatarAgents = new AvatarAgentService();

  private agentProfile(meetingType: MeetingType) {
    return meetingType === 'support' ? config.videoMeetings.support : config.videoMeetings.sales;
  }

  private assertSalesEnabled(meetingType: MeetingType): void {
    if (meetingType === 'sales' && !config.videoMeetings.salesEnabled && !config.videoMeetings.salesAvatarEnabled) {
      throw new ValidationError('Sales is not enabled yet. Support avatar is available first.');
    }
  }

  async getAgents(meetingType: MeetingType) {
    if (meetingType === 'sales' && !config.videoMeetings.salesEnabled && !config.videoMeetings.salesAvatarEnabled) {
      throw new ValidationError('Sales is not enabled yet. Support avatar is available first.');
    }
    return this.avatarAgents.listAgents(meetingType);
  }

  getMethods(meetingType: MeetingType) {
    if (meetingType === 'sales' && !config.videoMeetings.salesEnabled) {
      throw new ValidationError('Sales meeting booking is not enabled yet.');
    }
    const methods: Array<{ id: string; label: string; available: boolean; description: string }> = [
      {
        id: 'manual',
        label: 'Ručno zakazivanje',
        available: true,
        description: 'Support tim potvrđuje termin i šalje link emailom.',
      },
    ];

    if (isZoomConfigured()) {
      methods.push({
        id: 'zoom',
        label: 'Zoom',
        available: true,
        description: 'Automatski Zoom soba za svaki poziv.',
      });
    }

    if (isGoogleMeetConfigured(meetingType)) {
      methods.push({
        id: 'google_meet',
        label: 'Google Meet',
        available: true,
        description: 'Instant link ka Google Meet sobi.',
      });
    }

    return { meetingType, methods };
  }

  async book(userId: string, meetingType: MeetingType, dto: BookMeetingDtoType) {
    if (meetingType === 'sales' && !config.videoMeetings.salesEnabled) {
      throw new ValidationError('Sales meeting booking is not enabled yet.');
    }

    const agent = this.agentProfile(meetingType);
    const duration = dto.durationMinutes ?? config.videoMeetings.defaultDurationMinutes;
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new ValidationError('scheduledAt is invalid');
    }

    let provider = dto.provider;
    if (provider === 'zoom' && !isZoomConfigured()) provider = 'manual';
    if (provider === 'google_meet' && !isGoogleMeetConfigured(meetingType)) provider = 'manual';

    let status: 'pending' | 'scheduled' = 'pending';
    let meetingUrl: string | null = null;
    let externalMeetingId: string | null = null;

    if (provider === 'google_meet') {
      const room = resolveGoogleMeetRoom(meetingType);
      if (room) {
        status = 'scheduled';
        meetingUrl = room.meetingUrl;
        externalMeetingId = room.externalMeetingId;
      }
    } else if (provider === 'zoom') {
      try {
        const zoom = await createZoomMeeting({
          topic: dto.topic,
          startTime: scheduledAt,
          durationMinutes: duration,
          agenda: dto.description,
        });
        status = 'scheduled';
        meetingUrl = zoom.meetingUrl;
        externalMeetingId = zoom.externalMeetingId;
      } catch (err) {
        logger.warn('Zoom meeting create failed — falling back to pending manual', {
          error: err instanceof Error ? err.message : String(err),
        });
        provider = 'manual';
      }
    }

    const { rows } = await this.repo.insertRequest({
      userId,
      meetingType,
      provider,
      status,
      topic: dto.topic,
      description: dto.description ?? null,
      scheduledAt: status === 'scheduled' ? scheduledAt : null,
      durationMinutes: duration,
      meetingUrl,
      externalMeetingId,
      agentName: agent.agentName,
      agentAvatarUrl: agent.agentAvatarUrl,
      metadata: { requestedScheduledAt: scheduledAt.toISOString() },
    });

    const meeting = rows[0];
    const { rows: userRows } = await this.repo.getUserContact(userId);
    const user = userRows[0];

    if (user?.email) {
      if (status === 'scheduled' && meetingUrl) {
        this.notify.dispatch(
          this.notify.sendMeetingScheduledToClient({
            toEmail: user.email,
            toName: user.name,
            meetingType,
            topic: dto.topic,
            agentName: agent.agentName,
            agentAvatarUrl: agent.agentAvatarUrl,
            provider,
            meetingUrl,
            scheduledAt: scheduledAt.toISOString(),
            durationMinutes: duration,
          }),
          'client_scheduled'
        );
      } else {
        this.notify.dispatch(
          this.notify.sendMeetingPendingToClient({
            toEmail: user.email,
            toName: user.name,
            meetingType,
            topic: dto.topic,
            agentName: agent.agentName,
            provider,
          }),
          'client_pending'
        );
      }
    }

    if (meetingType === 'support' && (status === 'pending' || provider === 'manual')) {
      this.notify.dispatch(
        this.notify.notifySupportTeamNewRequest({
          userName: user?.name ?? userId,
          userEmail: user?.email ?? '',
          topic: dto.topic,
          description: dto.description,
          provider,
          scheduledAt: scheduledAt.toISOString(),
          meetingId: meeting.id,
          agentName: agent.agentName,
        }),
        'support_team_new'
      );
    }

    return meeting;
  }

  async listMine(userId: string, meetingType?: MeetingType) {
    const { rows } = await this.repo.listByUser(userId, meetingType);
    return rows;
  }

  async confirmSupportMeeting(meetingId: string, adminId: string, dto: ConfirmMeetingDtoType) {
    const { rows } = await this.repo.getById(meetingId);
    const meeting = rows[0];
    if (!meeting || meeting.meeting_type !== 'support') throw new NotFoundError('Meeting');
    if (meeting.status === 'scheduled' && meeting.meeting_url) {
      throw new ConflictError('Meeting is already scheduled');
    }

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : new Date();
    if (Number.isNaN(scheduledAt.getTime())) throw new ValidationError('scheduledAt is invalid');

    let meetingUrl = dto.meetingUrl?.trim() ?? '';
    let externalId = meeting.external_meeting_id;

    if (!meetingUrl && meeting.provider === 'zoom' && isZoomConfigured()) {
      const zoom = await createZoomMeeting({
        topic: meeting.topic,
        startTime: scheduledAt,
        durationMinutes: meeting.duration_minutes,
        agenda: meeting.description ?? undefined,
      });
      meetingUrl = zoom.meetingUrl;
      externalId = zoom.externalMeetingId;
    }

    if (!meetingUrl) {
      throw new ValidationError('meetingUrl is required for manual confirmation');
    }

    const { rows: updatedRows } = await this.repo.updateScheduled(
      meetingId,
      meetingUrl,
      externalId,
      scheduledAt
    );
    const updated = updatedRows[0];

    const { rows: userRows } = await this.repo.getUserContact(meeting.user_id);
    const user = userRows[0];
    if (user?.email) {
      this.notify.dispatch(
        this.notify.sendMeetingScheduledToClient({
          toEmail: user.email,
          toName: user.name,
          meetingType: 'support',
          topic: meeting.topic,
          agentName: meeting.agent_name ?? config.videoMeetings.support.agentName,
          agentAvatarUrl: meeting.agent_avatar_url ?? config.videoMeetings.support.agentAvatarUrl,
          provider: meeting.provider,
          meetingUrl,
          scheduledAt: scheduledAt.toISOString(),
          durationMinutes: meeting.duration_minutes,
        }),
        'client_confirmed'
      );
    }

    logger.info('Support meeting confirmed', { meetingId, adminId });
    return updated;
  }
}
