import { config } from '../../../config';
import { NotFoundError, ValidationError } from '../../../utils/errors';
import { resolveAvatarPhotoUrl } from '../../video-meetings/avatar/avatar-asset-url';
import { getAvatarAgentAsync } from '../../video-meetings/avatar/avatar-agent.config';
import { generateAgentReply } from '../../video-meetings/providers/avatar-ai-chat.provider';
import type { AgentType } from '../../video-meetings/avatar/avatar-agent.personas';
import { LiveCallSessionsRepository } from '../repository/live-sessions.repository';
import {
  listLiveProviderStatus,
  resolveLiveProvider,
  hasRealLiveProvider,
} from '../providers/live-provider.registry';
import type { LiveAvatarProviderId, LiveCallPlatform } from '../providers/live-provider.types';
import type { StartLiveCallSessionDtoType, LiveCallTurnDtoType } from '../dto/live-call.dto';
import { stopRecallBot } from '../providers/recall-bot.provider';
import logger from '../../../utils/logger';

function parsePayload(raw: Record<string, unknown> | string): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw || '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw ?? {};
}

export class LiveSessionOrchestratorService {
  private readonly repo = new LiveCallSessionsRepository();

  assertEnabled(): void {
    if (!config.liveCallAvatar.enabled && !config.liveCallAvatar.allowStub) {
      throw new ValidationError('Live call avatar is disabled');
    }
  }

  getProviderStatus() {
    const providers = listLiveProviderStatus();
    const liveReady = hasRealLiveProvider();
    return {
      enabled: config.liveCallAvatar.enabled || config.liveCallAvatar.allowStub,
      liveReady,
      humanHandoffEnabled: config.liveCallAvatar.humanHandoffEnabled,
      maxDurationMinutes: config.liveCallAvatar.maxDurationMinutes,
      recallConfigured: config.liveCallAvatar.recallApiKey.trim().length > 8,
      providers,
    };
  }

  async startSession(userId: string, dto: StartLiveCallSessionDtoType) {
    this.assertEnabled();
    const agentType = dto.agentType as AgentType;
    const agent = await getAvatarAgentAsync(agentType, dto.agentId ?? 'mila');
    const provider = resolveLiveProvider(dto.liveProvider);
    const photoUrl = resolveAvatarPhotoUrl(agent.avatarUrl, agent.photoUrl);

    let credentials;
    try {
      credentials = await provider.createSession({
        agentId: agent.id,
        agentName: agent.name,
        photoUrl,
        voiceId: agent.voiceId,
        heygenAvatarId: agent.heygenAvatarId,
        heygenVoiceId: agent.heygenVoiceId,
        greeting: agent.greeting,
      });
    } catch (err) {
      logger.error('Live provider createSession failed', {
        provider: provider.id,
        error: err instanceof Error ? err.message : String(err),
      });
      if (provider.id !== 'stub' && config.liveCallAvatar.allowStub) {
        credentials = await resolveLiveProvider('stub').createSession({
          agentId: agent.id,
          agentName: agent.name,
          photoUrl,
          voiceId: agent.voiceId,
          greeting: agent.greeting,
        });
      } else {
        throw err;
      }
    }

    const providerPayload = {
      ...credentials.clientConfig,
      sessionToken: credentials.sessionToken,
      token: credentials.sessionToken,
    };

    const { rows } = await this.repo.insertSession({
      userId,
      meetingRequestId: dto.meetingRequestId ?? null,
      agentId: agent.id,
      agentType,
      liveProvider: credentials.provider,
      platform: dto.platform as LiveCallPlatform,
      externalSessionId: credentials.sessionId ?? null,
      meetingUrl: dto.meetingUrl ?? null,
      joinUrl: dto.meetingUrl ?? null,
      providerPayload,
      maxDurationMinutes: config.liveCallAvatar.maxDurationMinutes,
      metadata: { agentName: agent.name, agentTitle: agent.title },
    });

    const session = rows[0];
    await this.repo.insertTurn({
      sessionId: session.id,
      role: 'assistant',
      outputText: agent.greeting,
      provider: credentials.provider,
    });

    return {
      sessionId: session.id,
      status: session.status,
      platform: session.platform,
      provider: credentials.provider,
      agent: {
        id: agent.id,
        name: agent.name,
        title: agent.title,
        avatarUrl: agent.avatarUrl,
        backgroundUrl: agent.backgroundUrl,
      },
      greeting: agent.greeting,
      clientConfig: credentials.clientConfig,
      joinUrl: session.join_url,
      meetingUrl: session.meeting_url,
    };
  }

  async processTurn(userId: string, sessionId: string, dto: LiveCallTurnDtoType) {
    this.assertEnabled();
    const { rows } = await this.repo.getByIdForUser(sessionId, userId);
    const session = rows[0];
    if (!session) throw new NotFoundError('Live session');
    if (session.status !== 'active') {
      throw new ValidationError(`Live session is ${session.status}`);
    }

    const payload = parsePayload(session.provider_payload);
    const provider = resolveLiveProvider(session.live_provider as LiveAvatarProviderId);
    const agentType = session.agent_type as AgentType;
    const agent = await getAvatarAgentAsync(agentType, session.agent_id);

    const started = Date.now();
    const historyRows = await this.repo.listTurns(sessionId, 20);
    const history = historyRows.rows
      .filter((t) => t.output_text || t.input_text)
      .map((t) => ({
        role: (t.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: (t.role === 'user' ? t.input_text : t.output_text) ?? '',
      }))
      .filter((h) => h.content.trim());

    const llmResult = await generateAgentReply({
      agentType,
      systemPersona: agent.persona,
      userMessage: dto.message,
      history,
    });
    const llmReply = llmResult.content;

    const externalId = session.external_session_id ?? String(payload.sessionId ?? '');
    let turnResult = null;
    if (externalId) {
      turnResult = await provider.sendTextTurn({
        externalSessionId: externalId,
        text: llmReply,
        sessionPayload: payload,
      });
    }

    const latencyMs = turnResult?.latencyMs ?? Date.now() - started;
    const replyText = turnResult?.text?.trim() ? turnResult.text : llmReply;

    await this.repo.insertTurn({
      sessionId,
      role: 'user',
      inputText: dto.message,
      provider: session.live_provider,
    });
    await this.repo.insertTurn({
      sessionId,
      role: 'assistant',
      outputText: replyText,
      latencyMs,
      provider: session.live_provider,
      metadata: { videoUrl: turnResult?.videoUrl ?? null },
    });
    await this.repo.incrementTurnCount(sessionId);

    return {
      message: {
        role: 'assistant' as const,
        text: replyText,
        videoUrl: turnResult?.videoUrl ?? null,
        audioBase64: turnResult?.audioBase64 ?? null,
        audioMime: turnResult?.audioMime ?? null,
      },
      latencyMs,
      provider: session.live_provider,
    };
  }

  async endSession(userId: string, sessionId: string) {
    const { rows } = await this.repo.getByIdForUser(sessionId, userId);
    const session = rows[0];
    if (!session) throw new NotFoundError('Live session');
    if (session.status === 'ended') return { sessionId, status: 'ended' };

    const payload = parsePayload(session.provider_payload);
    const provider = resolveLiveProvider(session.live_provider as LiveAvatarProviderId);
    if (session.external_session_id) {
      await provider.endSession(session.external_session_id, payload).catch(() => undefined);
    }

    const { rows: updated } = await this.repo.updateStatus(sessionId, 'ended');
    return { sessionId, status: updated[0]?.status ?? 'ended' };
  }

  async requestHandoff(userId: string, sessionId: string) {
    if (!config.liveCallAvatar.humanHandoffEnabled) {
      throw new ValidationError('Human handoff is disabled');
    }
    const { rows } = await this.repo.getByIdForUser(sessionId, userId);
    const session = rows[0];
    if (!session) throw new NotFoundError('Live session');

    const payload = parsePayload(session.provider_payload);
    const provider = resolveLiveProvider(session.live_provider as LiveAvatarProviderId);
    if (session.external_session_id) {
      await provider.endSession(session.external_session_id, payload).catch(() => undefined);
    }
    if (session.recall_bot_id) {
      await stopRecallBot(session.recall_bot_id).catch(() => undefined);
    }

    const { rows: updated } = await this.repo.updateStatus(sessionId, 'handoff', {
      handoffRequestedAt: new Date().toISOString(),
    });

    return {
      sessionId,
      status: updated[0]?.status ?? 'handoff',
      message: 'Human agent will join shortly. Check your email for the meeting link.',
      meetingUrl: session.meeting_url,
    };
  }

  async getSession(userId: string, sessionId: string) {
    const { rows } = await this.repo.getByIdForUser(sessionId, userId);
    const session = rows[0];
    if (!session) throw new NotFoundError('Live session');
    const turns = await this.repo.listTurns(sessionId, 100);
    const payload = parsePayload(session.provider_payload);
    return {
      session: {
        id: session.id,
        status: session.status,
        platform: session.platform,
        provider: session.live_provider,
        turnCount: session.turn_count,
        joinUrl: session.join_url,
        meetingUrl: session.meeting_url,
        recallBotId: session.recall_bot_id,
        metadata: parsePayload(session.metadata),
      },
      clientConfig: payload,
      turns: turns.rows.map((t) => ({
        id: t.id,
        role: t.role,
        text: t.role === 'user' ? t.input_text : t.output_text,
        latencyMs: t.latency_ms,
        createdAt: t.created_at,
      })),
    };
  }
}
