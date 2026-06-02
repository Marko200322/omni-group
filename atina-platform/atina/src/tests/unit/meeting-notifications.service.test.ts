import { config } from '../../config';
import { MeetingNotificationsService } from '../../modules/video-meetings/service/meeting-notifications.service';

const sendEmail = jest.fn().mockResolvedValue(undefined);

jest.mock('../../modules/notifications/service/notifications.service', () => ({
  NotificationsService: jest.fn().mockImplementation(() => ({
    sendEmail,
  })),
}));

describe('MeetingNotificationsService', () => {
  let service: MeetingNotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MeetingNotificationsService();
    (config as { videoMeetings: { supportNotifyEmail: string } }).videoMeetings.supportNotifyEmail = '';
    (config as { paymentNotifyEmail: string }).paymentNotifyEmail = '';
    (config as { admin: { email: string } }).admin.email = 'owner@test.com';
  });

  it('notifySupportTeamNewRequest emails support inbox', async () => {
    await service.notifySupportTeamNewRequest({
      userName: 'Marko',
      userEmail: 'client@test.com',
      topic: 'API integracija',
      provider: 'manual',
      meetingId: 'meet-1',
      agentName: 'Support tim',
    });

    expect(sendEmail).toHaveBeenCalledWith(
      'owner@test.com',
      expect.stringContaining('API integracija'),
      expect.stringContaining('meet-1'),
      expect.stringContaining('client@test.com')
    );
  });

  it('sendMeetingScheduledToClient includes join link and agent', async () => {
    await service.sendMeetingScheduledToClient({
      toEmail: 'client@test.com',
      toName: 'Marko',
      meetingType: 'support',
      topic: 'API integracija',
      agentName: 'Support tim',
      agentAvatarUrl: '',
      provider: 'google_meet',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      scheduledAt: new Date('2026-05-22T10:00:00Z').toISOString(),
      durationMinutes: 30,
    });

    expect(sendEmail).toHaveBeenCalledWith(
      'client@test.com',
      expect.stringContaining('zakazan'),
      expect.stringContaining('meet.google.com'),
      expect.stringContaining('Support tim')
    );
  });

  it('sendMeetingPendingToClient confirms request received', async () => {
    await service.sendMeetingPendingToClient({
      toEmail: 'client@test.com',
      toName: 'Marko',
      meetingType: 'support',
      topic: 'Deploy pomoć',
      agentName: 'Support tim',
      provider: 'manual',
    });

    expect(sendEmail).toHaveBeenCalledWith(
      'client@test.com',
      expect.stringContaining('primljen'),
      expect.stringContaining('Support tim'),
      expect.stringContaining('Deploy pomoć')
    );
  });
});
