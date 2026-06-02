import { config } from '../../config';
import { AvatarAgentService } from '../../modules/video-meetings/service/avatar-agent.service';
import { resetAvatarRosterCacheForTests } from '../../modules/video-meetings/avatar/avatar-agent.config';

jest.mock('../../modules/video-meetings/repository/avatar-sessions.repository', () => ({
  AvatarSessionsRepository: jest.fn().mockImplementation(() => ({
    createSession: jest.fn().mockResolvedValue({
      rows: [{ id: 'sess-1', user_id: 'u1', agent_type: 'support', status: 'active', metadata: {} }],
    }),
    getSessionForUser: jest.fn().mockResolvedValue({
      rows: [{ id: 'sess-1', user_id: 'u1', agent_type: 'support', status: 'active', metadata: { agentId: 'stefan' } }],
    }),
    insertMessage: jest.fn().mockImplementation(({ role, text }) => ({
      rows: [{ id: `msg-${role}`, role, text, audio_mime: null, audio_base64: null, video_url: null }],
    })),
    listMessagesForChat: jest.fn().mockResolvedValue({ rows: [] }),
    listMessages: jest.fn().mockResolvedValue({ rows: [] }),
  })),
}));

jest.mock('../../modules/video-meetings/providers/avatar-ai-aggregator.provider', () => ({
  useAiAggregatorForAvatars: jest.fn().mockReturnValue(true),
  avatarMediaCapabilities: jest.fn().mockReturnValue({
    voice: true,
    video: true,
    ai: true,
    aggregator: true,
  }),
  runConversationTurn: jest.fn().mockResolvedValue({
    text: 'Zdravo iz agregatora',
    replySource: 'aggregator',
    audioMime: 'audio/mpeg',
    audioBase64: 'abc',
    videoUrl: 'https://video.example/out.mp4',
    avatarUrl: 'https://img.example/face.png',
    mediaSource: 'aggregator',
  }),
  fetchRosterFromAggregator: jest.fn(),
}));

jest.mock('../../modules/video-meetings/avatar/avatar-agent.config', () => {
  const actual = jest.requireActual('../../modules/video-meetings/avatar/avatar-agent.config');
  return {
    ...actual,
    listAvatarAgentsAsync: jest.fn().mockResolvedValue({
      source: 'aggregator',
      agents: [
        {
          id: 'mila',
          name: 'Mila',
          title: 'Support',
          avatarUrl: '',
          voiceId: '',
          persona: '',
          greeting: 'Hi',
        },
      ],
    }),
    getAvatarAgent: jest.fn().mockReturnValue({
      id: 'stefan',
      name: 'Stefan',
      title: 'Billing',
      avatarUrl: '',
      voiceId: '',
      persona: '',
      greeting: 'Hello',
    }),
  };
});

describe('AvatarAgentService aggregator path', () => {
  beforeEach(() => {
    resetAvatarRosterCacheForTests();
    (config as { videoMeetings: { supportAvatarEnabled: boolean } }).videoMeetings.supportAvatarEnabled = true;
  });

  it('lists agents with rosterSource from async config', async () => {
    const service = new AvatarAgentService();
    const result = await service.listAgents('support');
    expect(result.rosterSource).toBe('aggregator');
    expect(result.agents[0].capabilities.aggregator).toBe(true);
  });

  it('startSession uses aggregator conversation turn', async () => {
    const service = new AvatarAgentService();
    const session = await service.startSession('u1', 'support', 'stefan');
    expect(session.greeting.text).toBe('Zdravo iz agregatora');
    expect(session.capabilities.aggregator).toBe(true);
  });
});
