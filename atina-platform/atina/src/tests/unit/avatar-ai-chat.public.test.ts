import { generateAgentReply } from '../../modules/video-meetings/providers/avatar-ai-chat.provider';

jest.mock('../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false }),
}));

describe('generateAgentReply public audience', () => {
  it('uses public fallback for pricing questions', async () => {
    const result = await generateAgentReply({
      agentType: 'support',
      systemPersona: '',
      history: [],
      userMessage: 'What is the pricing?',
      audience: 'public',
    });
    expect(result.source).toBe('fallback');
    expect(result.content).toMatch(/\/pricing/);
  });
});
