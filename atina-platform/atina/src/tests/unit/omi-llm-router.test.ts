import { config } from '../../config';
import {
  completeOmiLlmTurn,
  packageOmiLlmMessages,
  resolveOmiModelId,
  resolveOmiModelTier,
  scrubOmiLlmSecrets,
} from '../../modules/omi/omi-llm-router';
import { generateAgentReply } from '../../modules/video-meetings/providers/avatar-ai-chat.provider';

const mockAi = {
  configured: false,
  chatCompletions: jest.fn(),
};

jest.mock('../../integrations', () => ({
  getAiClient: () => ({
    isConfigured: () => mockAi.configured,
    chatCompletions: (...args: unknown[]) => mockAi.chatCompletions(...args),
  }),
}));

describe('omi-llm-router', () => {
  const prev = {
    simple: config.aggregators.omiSimpleModel,
    primary: config.aggregators.omiPrimaryModel,
    expert: config.aggregators.omiExpertModel,
    aiModel: config.aggregators.aiModel,
  };

  beforeEach(() => {
    mockAi.chatCompletions.mockReset();
    mockAi.configured = false;
    config.aggregators.omiSimpleModel = 'openai/gpt-5.1-mini';
    config.aggregators.omiPrimaryModel = 'openai/gpt-5.1';
    config.aggregators.omiExpertModel = 'openai/gpt-5.2';
    config.aggregators.aiModel = 'openrouter/auto';
  });

  afterAll(() => {
    config.aggregators.omiSimpleModel = prev.simple;
    config.aggregators.omiPrimaryModel = prev.primary;
    config.aggregators.omiExpertModel = prev.expert;
    config.aggregators.aiModel = prev.aiModel;
  });

  it('routes short FAQ to simple (Luna)', () => {
    expect(
      resolveOmiModelTier({
        userMessage: 'Where is billing in the sidebar?',
        history: [],
        audience: 'portal',
      }),
    ).toBe('simple');
    expect(resolveOmiModelId('simple')).toBe('openai/gpt-5.1-mini');
  });

  it('routes normal consult to primary (Sol)', () => {
    expect(
      resolveOmiModelTier({
        userMessage:
          'Our restaurant inbox is drowning and we lose lunch reservations every week. What should we look at?',
        history: [],
        audience: 'public',
        verifiedContext: 'Identified problems: missed inquiries.',
      }),
    ).toBe('primary');
    expect(resolveOmiModelId('primary')).toBe('openai/gpt-5.1');
  });

  it('routes rare complex cases to expert (Astra)', () => {
    expect(
      resolveOmiModelTier({
        userMessage:
          'We need a multi-tenant architecture migration from a legacy ERP with GDPR compliance and custom integration to our CRM.',
        history: [],
        audience: 'public',
      }),
    ).toBe('expert');
    expect(resolveOmiModelId('expert')).toBe('openai/gpt-5.2');
  });

  it('falls back to AI_MODEL when OMI_* model env is empty', () => {
    config.aggregators.omiPrimaryModel = '';
    expect(resolveOmiModelId('primary')).toBe('openrouter/auto');
  });

  it('packages controlled context without dumping long history verbatim', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `turn-${i} ${'x'.repeat(200)}`,
    }));
    const messages = packageOmiLlmMessages({
      systemPersona: 'You are Omi.',
      userMessage: 'Help with inbox.',
      history,
      verifiedContext: 'VERIFIED Omni catalog\nSaaS: Launch €79/$89',
      historyTurns: 4,
      maxContextChars: 2000,
    });
    expect(messages[0]?.role).toBe('system');
    expect(messages[0]?.content).toMatch(/Verified backend context/);
    expect(messages[0]?.content).toMatch(/Launch €79/);
    expect(messages[0]?.content).toMatch(/Prior conversation/);
    expect(messages.filter((m) => m.role !== 'system').length).toBeLessThanOrEqual(5);
    expect(JSON.stringify(messages)).not.toMatch(/AI_KEY|sk-live-/);
  });

  it('scrubs secret-looking tokens from model output', () => {
    const scrubbed = scrubOmiLlmSecrets(
      'Use key sk-live-abcdefghijklmnopqrstuvwxyz123456 and Bearer abcdefghijklmnopqrstuvwxyz012345',
    );
    expect(scrubbed).not.toMatch(/sk-live-/);
    expect(scrubbed).not.toMatch(/Bearer abcdef/);
    expect(scrubbed).toMatch(/\[redacted\]/);
  });

  it('completeOmiLlmTurn returns null when AI is not configured', async () => {
    await expect(
      completeOmiLlmTurn({
        systemPersona: 'Omi',
        userMessage: 'hello pricing',
        history: [],
        audience: 'public',
      }),
    ).resolves.toBeNull();
    expect(mockAi.chatCompletions).not.toHaveBeenCalled();
  });

  it('completeOmiLlmTurn passes routed model and recovers on provider failure', async () => {
    mockAi.configured = true;
    mockAi.chatCompletions.mockResolvedValueOnce(null);
    await expect(
      completeOmiLlmTurn({
        systemPersona: 'Omi',
        userMessage: 'Where is the contact page?',
        history: [],
        audience: 'public',
      }),
    ).resolves.toBeNull();
    expect(mockAi.chatCompletions).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'openai/gpt-5.1-mini' }),
    );

    mockAi.chatCompletions.mockRejectedValueOnce(new Error('upstream 500 AI_KEY=leak'));
    await expect(
      completeOmiLlmTurn({
        systemPersona: 'Omi',
        userMessage: 'Where is the contact page?',
        history: [],
        audience: 'public',
      }),
    ).resolves.toBeNull();
  });

  it('generateAgentReply uses AI when configured and falls back without leaking secrets', async () => {
    mockAi.configured = true;
    mockAi.chatCompletions.mockResolvedValueOnce({
      content: 'See /pricing. debug AI_KEY=secret sk-live-abcdefghijklmnopqrstuvwxyz123456',
    });
    const ai = await generateAgentReply({
      agentType: 'support',
      systemPersona: '',
      history: [],
      userMessage:
        'Our salon loses bookings because the inbox is messy every Monday — what should we consider?',
      audience: 'public',
      verifiedContext: 'VERIFIED Omni catalog\n- Landing + copy (landing) €990',
    });
    expect(ai.source).toBe('ai');
    expect(ai.modelTier).toBe('primary');
    expect(ai.content).toMatch(/\/pricing/);
    expect(ai.content).not.toMatch(/sk-live-/);
    expect(ai.content).not.toMatch(/AI_KEY=secret/);

    mockAi.chatCompletions.mockResolvedValueOnce(null);
    const fallback = await generateAgentReply({
      agentType: 'support',
      systemPersona: '',
      history: [],
      userMessage: 'What is the pricing?',
      audience: 'public',
    });
    expect(fallback.source).toBe('fallback');
    expect(fallback.content).toMatch(/\/pricing/);
    expect(fallback.content).not.toMatch(/sk-|AI_KEY|OPENROUTER/);
  });
});
