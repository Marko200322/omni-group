import { config } from '../../../config';
import { NotFoundError, ValidationError } from '../../../utils/errors';
import { AvatarSessionsRepository } from '../repository/avatar-sessions.repository';
import type { AgentType } from '../avatar/avatar-agent.personas';
import {
  DEFAULT_PUBLIC_GREETING,
  DEFAULT_SALES_GREETING,
  DEFAULT_SALES_PERSONA,
  DEFAULT_SUPPORT_GREETING,
  DEFAULT_SUPPORT_PERSONA,
  PUBLIC_SITE_PERSONA,
  SITE_ASSISTANT_NAME,
} from '../avatar/avatar-agent.personas';
import { getAvatarAgent, getAvatarAgentAsync, listAvatarAgentsAsync } from '../avatar/avatar-agent.config';
import type { AvatarAgentDefinition } from '../avatar/avatar-agent.roster';
import {
  avatarMediaCapabilities,
  runConversationTurn,
  useAiAggregatorForAvatars,
  listAvatarMediaStackStatus,
} from '../providers/avatar-ai-aggregator.provider';
import { AvatarClientMemoryProvider } from '../providers/avatar-client-memory.provider';
import { getAiClient } from '../../../integrations';

export type AvatarCapabilities = {
  chat: boolean;
  voice: boolean;
  video: boolean;
  ai: boolean;
  aggregator: boolean;
};

export type AvatarMessagePayload = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audioDataUrl?: string | null;
  videoUrl?: string | null;
  createdAt?: string;
};

function sessionAgentId(metadata: Record<string, unknown> | string): string | undefined {
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata) as Record<string, unknown>;
      return typeof parsed.agentId === 'string' ? parsed.agentId : undefined;
    } catch {
      return undefined;
    }
  }
  return typeof metadata.agentId === 'string' ? metadata.agentId : undefined;
}

function withSiteAssistantIdentity(agent: AvatarAgentDefinition): AvatarAgentDefinition {
  return {
    ...agent,
    name: SITE_ASSISTANT_NAME,
    title: 'Omni Group assistant',
    greeting: DEFAULT_SUPPORT_GREETING,
  };
}

function avatarEnabled(agentType: AgentType): boolean {
  return agentType === 'support'
    ? config.videoMeetings.supportAvatarEnabled
    : config.videoMeetings.salesAvatarEnabled;
}

function assertAvatarEnabled(agentType: AgentType): void {
  if (!avatarEnabled(agentType)) {
    throw new ValidationError(`${agentType} avatar is disabled`);
  }
}

function toAudioDataUrl(mime: string | null | undefined, base64: string | null | undefined): string | null {
  if (!mime || !base64) return null;
  return `data:${mime};base64,${base64}`;
}

function presentAgent(
  agentType: AgentType,
  agent: AvatarAgentDefinition,
  rosterSource?: string
) {
  const caps = avatarMediaCapabilities(agent);
  const hasImage = Boolean(agent.avatarUrl.trim());
  let avatarType: 'conversational' | 'image' | 'initials' = 'initials';
  if (caps.video) avatarType = 'conversational';
  else if (hasImage) avatarType = 'image';

  return {
    id: agent.id,
    name: agent.name,
    title: agent.title,
    avatarUrl: agent.avatarUrl || null,
    backgroundUrl: agent.backgroundUrl || null,
    avatarType,
    capabilities: {
      chat: true,
      voice: caps.voice,
      video: caps.video,
      ai: caps.ai,
      aggregator: caps.aggregator,
    },
    agentType,
    rosterSource: rosterSource ?? (useAiAggregatorForAvatars() ? 'aggregator' : 'system'),
  };
}

export class AvatarAgentService {
  private readonly repo = new AvatarSessionsRepository();
  private readonly clientMemory = new AvatarClientMemoryProvider();

  mediaStack() {
    return listAvatarMediaStackStatus();
  }

  async listAgents(agentType: AgentType) {
    if (!avatarEnabled(agentType)) {
      return {
        agentType,
        rosterSource: 'disabled',
        enabled: false,
        agents: [],
      };
    }
    const { agents, source } = await listAvatarAgentsAsync(agentType);
    return {
      agentType,
      rosterSource: source,
      enabled: true,
      agents: agents.map((a) => presentAgent(agentType, a, source)),
    };
  }

  getAgentPresentation(agentType: AgentType) {
    return this.listAgents(agentType);
  }

  private mapMessage(row: {
    id: string;
    role: string;
    text: string;
    audio_mime?: string | null;
    audio_base64?: string | null;
    video_url?: string | null;
    created_at?: Date | string;
  }): AvatarMessagePayload {
    return {
      id: row.id,
      role: row.role as 'user' | 'assistant',
      text: row.text,
      audioDataUrl: toAudioDataUrl(row.audio_mime, row.audio_base64),
      videoUrl: row.video_url ?? null,
      createdAt: row.created_at ? String(row.created_at) : undefined,
    };
  }

  private resolveGreeting(agent: AvatarAgentDefinition, agentType: AgentType): string {
    if (agent.greeting.trim()) return agent.greeting.trim();
    return agentType === 'support' ? DEFAULT_SUPPORT_GREETING : DEFAULT_SALES_GREETING;
  }

  async startSession(userId: string, agentType: AgentType, agentId?: string) {
    assertAvatarEnabled(agentType);
    await listAvatarAgentsAsync(agentType);
    const base = getAvatarAgent(agentType, agentId);
    const agent = agentType === 'support' ? withSiteAssistantIdentity(base) : base;

    const { rows: sessionRows } = await this.repo.createSession(userId, agentType, {
      agentId: agent.id,
      agentName: agent.name,
    });
    const session = sessionRows[0];

    const turn = await runConversationTurn({
      agentType,
      agentId: agent.id,
      sessionId: session.id,
      mode: 'greeting',
      agent,
      history: [],
      audience: 'portal',
    });

    if (turn.avatarUrl?.trim()) {
      agent.avatarUrl = turn.avatarUrl.trim();
    }

    const greetingText = turn.text || this.resolveGreeting(agent, agentType);

    const { rows: messageRows } = await this.repo.insertMessage({
      sessionId: session.id,
      role: 'assistant',
      text: greetingText,
      audioMime: turn.audioMime,
      audioBase64: turn.audioBase64,
      videoUrl: turn.videoUrl,
      metadata: {
        kind: 'greeting',
        agentId: agent.id,
        replySource: turn.replySource,
        mediaSource: turn.mediaSource,
      },
    });

    const caps = avatarMediaCapabilities(agent);
    return {
      sessionId: session.id,
      agentType,
      audience: 'portal' as const,
      agent: presentAgent(agentType, agent),
      greeting: this.mapMessage(messageRows[0]),
      capabilities: {
        chat: true,
        voice: caps.voice,
        video: caps.video,
        ai: getAiClient().isConfigured(),
        aggregator: useAiAggregatorForAvatars(),
      },
    };
  }

  async startGuestSession(agentId?: string) {
    assertAvatarEnabled('support');
    await listAvatarAgentsAsync('support');
    const base = getAvatarAgent('support', agentId);
    const agent = {
      ...base,
      name: SITE_ASSISTANT_NAME,
      title: 'Omni Group assistant',
      persona: PUBLIC_SITE_PERSONA,
      greeting: DEFAULT_PUBLIC_GREETING,
    };

    const { rows: sessionRows } = await this.repo.createSession(null, 'support', {
      guest: true,
      audience: 'public',
      agentId: agent.id,
      agentName: agent.name,
    });
    const session = sessionRows[0];

    const turn = await runConversationTurn({
      agentType: 'support',
      agentId: agent.id,
      sessionId: session.id,
      mode: 'greeting',
      agent,
      history: [],
      audience: 'public',
    });

    if (turn.avatarUrl?.trim()) {
      agent.avatarUrl = turn.avatarUrl.trim();
    }

    const greetingText = turn.text || DEFAULT_PUBLIC_GREETING;
    const { rows: messageRows } = await this.repo.insertMessage({
      sessionId: session.id,
      role: 'assistant',
      text: greetingText,
      audioMime: turn.audioMime,
      audioBase64: turn.audioBase64,
      videoUrl: turn.videoUrl,
      metadata: {
        kind: 'greeting',
        guest: true,
        agentId: agent.id,
        replySource: turn.replySource,
        mediaSource: turn.mediaSource,
      },
    });

    const caps = avatarMediaCapabilities(agent);
    return {
      sessionId: session.id,
      agentType: 'support' as const,
      audience: 'public' as const,
      agent: presentAgent('support', agent),
      greeting: this.mapMessage(messageRows[0]),
      capabilities: {
        chat: true,
        voice: caps.voice,
        video: caps.video,
        ai: getAiClient().isConfigured(),
        aggregator: false,
      },
    };
  }

  async chatGuest(sessionId: string, userMessage: string) {
    assertAvatarEnabled('support');
    const trimmed = userMessage.trim();
    if (trimmed.length < 1) throw new ValidationError('message is required');

    const { rows: sessions } = await this.repo.getGuestSession(sessionId);
    const session = sessions[0];
    if (!session || session.agent_type !== 'support') throw new NotFoundError('Avatar session');
    if (session.status !== 'active') throw new ValidationError('Session is closed');

    const boundAgentId = sessionAgentId(session.metadata);
    const base = await getAvatarAgentAsync('support', boundAgentId);
    const agent = {
      ...base,
      name: SITE_ASSISTANT_NAME,
      title: 'Omni Group assistant',
      persona: PUBLIC_SITE_PERSONA,
      greeting: DEFAULT_PUBLIC_GREETING,
    };

    await this.repo.insertMessage({
      sessionId,
      role: 'user',
      text: trimmed,
      metadata: { agentId: agent.id, guest: true },
    });

    const { rows: historyRows } = await this.repo.listMessagesForChat(sessionId);
    const history = historyRows
      .slice(0, -1)
      .filter((h) => h.role === 'user' || h.role === 'assistant')
      .map((h) => ({ role: h.role as 'user' | 'assistant', content: h.text }));

    const turn = await runConversationTurn({
      agentType: 'support',
      agentId: agent.id,
      sessionId,
      mode: 'reply',
      agent,
      history,
      userMessage: trimmed,
      audience: 'public',
    });

    if (turn.avatarUrl?.trim()) {
      agent.avatarUrl = turn.avatarUrl.trim();
    }

    const { rows: assistantRows } = await this.repo.insertMessage({
      sessionId,
      role: 'assistant',
      text: turn.text,
      audioMime: turn.audioMime,
      audioBase64: turn.audioBase64,
      videoUrl: turn.videoUrl,
      metadata: {
        replySource: turn.replySource,
        mediaSource: turn.mediaSource,
        agentId: agent.id,
        guest: true,
      },
    });

    const caps = avatarMediaCapabilities(agent);
    return {
      sessionId,
      audience: 'public' as const,
      message: this.mapMessage(assistantRows[0]),
      agent: presentAgent('support', agent),
      capabilities: {
        chat: true,
        voice: caps.voice,
        video: caps.video,
        ai: getAiClient().isConfigured(),
        aggregator: false,
      },
    };
  }

  async chat(userId: string, agentType: AgentType, sessionId: string, userMessage: string) {
    assertAvatarEnabled(agentType);
    const trimmed = userMessage.trim();
    if (trimmed.length < 1) throw new ValidationError('message is required');

    const { rows: sessions } = await this.repo.getSessionForUser(sessionId, userId);
    const session = sessions[0];
    if (!session || session.agent_type !== agentType) throw new NotFoundError('Avatar session');
    if (session.status !== 'active') throw new ValidationError('Session is closed');

    const boundAgentId = sessionAgentId(session.metadata);
    const base = await getAvatarAgentAsync(agentType, boundAgentId);
    const agent = agentType === 'support' ? withSiteAssistantIdentity(base) : base;

    await this.repo.insertMessage({
      sessionId,
      role: 'user',
      text: trimmed,
      metadata: { agentId: agent.id },
    });

    const { rows: historyRows } = await this.repo.listMessagesForChat(sessionId);
    const history = historyRows
      .slice(0, -1)
      .filter((h) => h.role === 'user' || h.role === 'assistant')
      .map((h) => ({ role: h.role as 'user' | 'assistant', content: h.text }));

    const clientMemoryContext = await this.clientMemory.loadContext(userId, agentType, agent.id);

  const persona =
      agent.persona.trim() ||
      (agentType === 'support' ? DEFAULT_SUPPORT_PERSONA : DEFAULT_SALES_PERSONA);

    const turn = await runConversationTurn({
      agentType,
      agentId: agent.id,
      sessionId,
      mode: 'reply',
      agent: { ...agent, persona },
      history,
      userMessage: trimmed,
      clientMemoryContext,
      audience: 'portal',
    });

    if (turn.avatarUrl?.trim()) {
      agent.avatarUrl = turn.avatarUrl.trim();
    }

    const { rows: assistantRows } = await this.repo.insertMessage({
      sessionId,
      role: 'assistant',
      text: turn.text,
      audioMime: turn.audioMime,
      audioBase64: turn.audioBase64,
      videoUrl: turn.videoUrl,
      metadata: {
        replySource: turn.replySource,
        mediaSource: turn.mediaSource,
        agentId: agent.id,
      },
    });

    const caps = avatarMediaCapabilities(agent);
    this.clientMemory.rememberTurn(userId, agentType, agent.id, trimmed, turn.text);
    return {
      sessionId,
      message: this.mapMessage(assistantRows[0]),
      agent: presentAgent(agentType, agent),
      capabilities: {
        chat: true,
        voice: caps.voice,
        video: caps.video,
        ai: getAiClient().isConfigured(),
        aggregator: useAiAggregatorForAvatars(),
      },
    };
  }

  async getHistory(userId: string, agentType: AgentType, sessionId: string) {
    assertAvatarEnabled(agentType);
    const { rows: sessions } = await this.repo.getSessionForUser(sessionId, userId);
    const session = sessions[0];
    if (!session || session.agent_type !== agentType) throw new NotFoundError('Avatar session');

    const agent = await getAvatarAgentAsync(agentType, sessionAgentId(session.metadata));
    const { rows } = await this.repo.listMessages(sessionId);
    return {
      sessionId,
      agent: presentAgent(agentType, agent),
      messages: rows
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => this.mapMessage(m)),
    };
  }
}
