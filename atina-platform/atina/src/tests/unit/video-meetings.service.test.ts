import { config } from '../../config';
import { VideoMeetingsService } from '../../modules/video-meetings/service/video-meetings.service';
import { ValidationError } from '../../utils/errors';

jest.mock('../../modules/video-meetings/repository/video-meetings.repository', () => ({
  VideoMeetingsRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../modules/video-meetings/service/meeting-notifications.service', () => ({
  MeetingNotificationsService: jest.fn().mockImplementation(() => ({ dispatch: jest.fn() })),
}));

jest.mock('../../modules/video-meetings/service/avatar-agent.service', () => ({
  AvatarAgentService: jest.fn().mockImplementation(() => ({
    listAgents: jest.fn().mockResolvedValue({
      agentType: 'sales',
      rosterSource: 'system',
      agents: [{ id: 'nikola' }, { id: 'ana' }, { id: 'marko' }, { id: 'ivana' }],
    }),
  })),
}));

describe('VideoMeetingsService sales gate', () => {
  beforeEach(() => {
    (config as { videoMeetings: { salesEnabled: boolean; salesAvatarEnabled: boolean } }).videoMeetings.salesEnabled = false;
    (config as { videoMeetings: { salesAvatarEnabled: boolean } }).videoMeetings.salesAvatarEnabled = true;
  });

  it('allows sales avatar agents when SALES_MEETINGS_ENABLED is false', async () => {
    const service = new VideoMeetingsService();
    const agents = await service.getAgents('sales');
    expect(agents.agents.length).toBeGreaterThanOrEqual(4);
  });

  it('blocks sales meeting methods when booking disabled', () => {
    const service = new VideoMeetingsService();
    expect(() => service.getMethods('sales')).toThrow(ValidationError);
  });

  it('allows support regardless of sales flag', async () => {
    const service = new VideoMeetingsService();
    const agents = await service.getAgents('support');
    expect(agents.agents.length).toBeGreaterThan(0);
  });
});
