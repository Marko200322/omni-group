import { config } from '../config';
import { AggregatorHttpClient } from './aggregator-http-client';
import { isAggregatorGatewayProvider, isOpenRouterProvider } from './provider-detect';
import { parseRecommendationsFromContent } from './openrouter-direct';
export type AiRememberPayload = {
  namespace: string;
  key: string;
  value: Record<string, unknown>;
  userId?: string;
};

export type AiRecommendationResult = {
  recommendations?: string[];
};

export type AiChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AiChatCompletionResult = {
  content: string;
  model?: string;
};

export type AiAvatarAgent = {
  id: string;
  name: string;
  title: string;
  persona?: string;
  greeting?: string;
  avatarUrl?: string;
  voiceId?: string;
};

export type AiAvatarRosterResult = {
  agents: AiAvatarAgent[];
  source?: string;
};

export type AiAvatarSpeechResult = {
  audioBase64?: string;
  audioMimeType?: string;
  videoUrl?: string;
  avatarUrl?: string;
};

export type AiAvatarConversationTurnResult = {
  text: string;
  source?: string;
  audioBase64?: string;
  audioMimeType?: string;
  videoUrl?: string;
  avatarUrl?: string;
};

function aiCreds(): { url: string; key: string } {
  return config?.aggregators?.ai ?? { url: '', key: '' };
}

export class AiClient extends AggregatorHttpClient {
  constructor(creds?: { url: string; key: string }) {
    super(creds ?? aiCreds(), 'ai');
  }

  remember(payload: AiRememberPayload): Promise<unknown | null> {
    return this.request('POST', '/v1/memory/remember', payload);
  }

  recall(namespace: string, key?: string): Promise<unknown | null> {
    const query = key ? `?namespace=${encodeURIComponent(namespace)}&key=${encodeURIComponent(key)}` : `?namespace=${encodeURIComponent(namespace)}`;
    return this.request('GET', `/v1/memory/recall${query}`);
  }

  fetchRecommendations(context: Record<string, unknown>): Promise<AiRecommendationResult | null> {
    if (!this.isConfigured()) return Promise.resolve(null);

    const creds = this.getCredentials();
    if (isOpenRouterProvider(creds)) {
      return this.fetchRecommendationsViaChat(context);
    }

    if (isAggregatorGatewayProvider(creds)) {
      return this.request<AiRecommendationResult>('POST', '/v1/recommendations', { context });
    }

    return this.request<AiRecommendationResult>('POST', '/v1/recommendations', { context }).then(
      (gateway) => gateway ?? this.fetchRecommendationsViaChat(context)
    );
  }

  private async fetchRecommendationsViaChat(
    context: Record<string, unknown>
  ): Promise<AiRecommendationResult | null> {
    const chat = await this.chatCompletions({
      model: config.aggregators.aiModel,
      maxTokens: 512,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You are a B2B SaaS market analyst. Reply with JSON only: {"recommendations":["...","...","..."]}. Each item is one actionable opportunity.',
        },
        {
          role: 'user',
          content: JSON.stringify(context),
        },
      ],
    });
    if (!chat?.content) return null;
    const recommendations = parseRecommendationsFromContent(chat.content);
    return recommendations.length ? { recommendations } : null;
  }
  chatCompletions(input: {
    messages: AiChatMessage[];
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<AiChatCompletionResult | null> {
    const path = isOpenRouterProvider(this.getCredentials())
      ? '/chat/completions'
      : '/v1/chat/completions';
    return this.request<{ choices?: Array<{ message?: { content?: string } }>; content?: string; text?: string }>(
      'POST',
      path,      {
        model: input.model ?? 'default',
        messages: input.messages,
        max_tokens: input.maxTokens ?? 320,
        temperature: input.temperature ?? 0.7,
      },
      { timeout: 60000 }
    ).then((data) => {
      if (!data) return null;
      const content = (data.choices?.[0]?.message?.content ?? data.content ?? data.text ?? '').trim();
      if (!content) return null;
      return { content, model: input.model };
    });
  }

  /** Sistem generiše tim avatara (portreti, personae, glasovi) preko AI agregatora. */
  generateAvatarRoster(input: {
    team: 'support' | 'sales';
    count?: number;
    locale?: string;
    brand?: string;
  }): Promise<AiAvatarRosterResult | null> {
    return this.request<AiAvatarRosterResult>('POST', '/v1/avatars/roster/generate', {
      team: input.team,
      count: input.count,
      locale: input.locale ?? 'sr-RS',
      brand: input.brand ?? 'ATINA',
    }, { timeout: 120000 });
  }

  /** TTS + lip-sync animacija — agregator spaja ElevenLabs / Live Portrait / slično. */
  renderAvatarSpeech(input: {
    team: 'support' | 'sales';
    agentId: string;
    text: string;
    sessionId: string;
    avatarUrl?: string;
    voiceId?: string;
  }): Promise<AiAvatarSpeechResult | null> {
    return this.request<AiAvatarSpeechResult>('POST', '/v1/avatars/speech/render', input, { timeout: 120000 });
  }

  /** Jedan turn: razumevanje + odgovor + govor + animacija (preferirani put). */
  avatarConversationTurn(input: {
    team: 'support' | 'sales';
    agentId: string;
    sessionId: string;
    mode: 'greeting' | 'reply';
    agent: {
      name: string;
      title: string;
      persona: string;
      avatarUrl?: string;
      voiceId?: string;
    };
    history?: AiChatMessage[];
    userMessage?: string;
  }): Promise<AiAvatarConversationTurnResult | null> {
    return this.request<AiAvatarConversationTurnResult>(
      'POST',
      '/v1/avatars/conversation/turn',
      input,
      { timeout: 120000 }
    );
  }
}

let defaultAiClient: AiClient | undefined;

export function getAiClient(override?: AiClient): AiClient {
  if (override) return override;
  if (!defaultAiClient) defaultAiClient = new AiClient();
  return defaultAiClient;
}

export function resetAiClientForTests(): void {
  defaultAiClient = undefined;
}
