import { config } from '../../../config';
import { getAiClient } from '../../../integrations';
import type { AgentType } from '../avatar/avatar-agent.personas';
import type { AvatarAgentDefinition } from '../avatar/avatar-agent.roster';
import { generateAgentReply } from '../providers/avatar-ai-chat.provider';
import {
  avatarVideoCapable,
  renderAvatarVideo,
} from '../providers/avatar-video-render.provider';
import { listConfiguredTtsProviders, renderAvatarTts } from '../providers/avatar-tts-render.provider';

export type AggregatorSpeechResult = {
  audioMime: string | null;
  audioBase64: string | null;
  videoUrl: string | null;
  avatarUrl: string | null;
  source: 'aggregator' | 'local' | 'none';
};

export type AggregatorTurnResult = {
  text: string;
  replySource: 'aggregator' | 'ai' | 'fallback';
  audioMime: string | null;
  audioBase64: string | null;
  videoUrl: string | null;
  avatarUrl: string | null;
  mediaSource: 'aggregator' | 'local' | 'none';
};

export function useAiAggregatorForAvatars(): boolean {
  if (!config.videoMeetings.avatarUseAiAggregator) return false;
  return getAiClient().isConfigured();
}

function mapAggregatorAgent(row: {
  id: string;
  name: string;
  title?: string;
  persona?: string;
  greeting?: string;
  avatarUrl?: string;
  backgroundUrl?: string;
  voiceId?: string;
}): AvatarAgentDefinition {
  return {
    id: row.id,
    name: row.name,
    title: row.title ?? '',
    persona: row.persona ?? '',
    greeting: row.greeting ?? '',
    avatarUrl: row.avatarUrl ?? '',
    backgroundUrl: row.backgroundUrl ?? '',
    voiceId: row.voiceId ?? '',
  };
}

export async function fetchRosterFromAggregator(
  agentType: AgentType,
  count?: number
): Promise<AvatarAgentDefinition[] | null> {
  if (!useAiAggregatorForAvatars()) return null;
  const ai = getAiClient();
  const result = await ai.generateAvatarRoster({
    team: agentType,
    count: count ?? (agentType === 'support' ? 5 : 6),
    brand: config.app.name,
  });
  if (!result?.agents?.length) return null;
  return result.agents.map(mapAggregatorAgent);
}

export async function renderSpeechViaAggregator(input: {
  agentType: AgentType;
  agentId: string;
  sessionId: string;
  text: string;
  avatarUrl: string;
  voiceId: string;
}): Promise<AggregatorSpeechResult | null> {
  if (!useAiAggregatorForAvatars()) return null;
  const ai = getAiClient();
  const result = await ai.renderAvatarSpeech({
    team: input.agentType,
    agentId: input.agentId,
    sessionId: input.sessionId,
    text: input.text,
    avatarUrl: input.avatarUrl || undefined,
    voiceId: input.voiceId || undefined,
  });
  if (!result) return null;
  return {
    audioMime: result.audioMimeType ?? (result.audioBase64 ? 'audio/mpeg' : null),
    audioBase64: result.audioBase64 ?? null,
    videoUrl: result.videoUrl ?? null,
    avatarUrl: result.avatarUrl ?? null,
    source: 'aggregator',
  };
}

export async function localSpeechRender(input: {
  agentType: AgentType;
  agentId: string;
  sessionId: string;
  text: string;
  avatarUrl: string;
  voiceId: string;
}): Promise<AggregatorSpeechResult> {
  let audioMime: string | null = null;
  let audioBase64: string | null = null;
  let videoUrl: string | null = null;

  const tts = await renderAvatarTts(input.text, input.voiceId);
  if (tts) {
    audioMime = tts.mimeType;
    audioBase64 = tts.audioBase64;
    if (avatarVideoCapable(input.avatarUrl)) {
      const video = await renderAvatarVideo({
        imageUrl: input.avatarUrl,
        text: input.text,
        voiceId: input.voiceId,
        audioBase64: tts.audioBase64,
        audioMimeType: tts.mimeType,
        sessionId: input.sessionId,
        agentType: `${input.agentType}:${input.agentId}`,
      });
      videoUrl = video?.videoUrl ?? null;
    }
  }

  return {
    audioMime,
    audioBase64,
    videoUrl,
    avatarUrl: null,
    source: audioBase64 ? 'local' : 'none',
  };
}

export async function renderAgentSpeech(input: {
  agentType: AgentType;
  agentId: string;
  sessionId: string;
  text: string;
  avatarUrl: string;
  voiceId: string;
}): Promise<AggregatorSpeechResult> {
  const fromAgg = await renderSpeechViaAggregator(input);
  if (fromAgg) return fromAgg;
  return localSpeechRender(input);
}

export async function conversationTurnViaAggregator(input: {
  agentType: AgentType;
  agentId: string;
  sessionId: string;
  mode: 'greeting' | 'reply';
  agent: AvatarAgentDefinition;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage?: string;
}): Promise<AggregatorTurnResult | null> {
  if (!useAiAggregatorForAvatars()) return null;
  const ai = getAiClient();
  const result = await ai.avatarConversationTurn({
    team: input.agentType,
    agentId: input.agentId,
    sessionId: input.sessionId,
    mode: input.mode,
    agent: {
      name: input.agent.name,
      title: input.agent.title,
      persona: input.agent.persona,
      avatarUrl: input.agent.avatarUrl || undefined,
      voiceId: input.agent.voiceId || undefined,
    },
    history: input.history.map((h) => ({ role: h.role, content: h.content })),
    userMessage: input.userMessage,
  });
  if (!result?.text?.trim()) return null;

  const hasMedia = Boolean(result.audioBase64 || result.videoUrl);
  return {
    text: result.text.trim(),
    replySource: 'aggregator',
    audioMime: result.audioMimeType ?? (result.audioBase64 ? 'audio/mpeg' : null),
    audioBase64: result.audioBase64 ?? null,
    videoUrl: result.videoUrl ?? null,
    avatarUrl: result.avatarUrl ?? null,
    mediaSource: hasMedia ? 'aggregator' : 'none',
  };
}

export async function conversationTurnLocal(input: {
  agentType: AgentType;
  agentId: string;
  sessionId: string;
  mode: 'greeting' | 'reply';
  agent: AvatarAgentDefinition;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage?: string;
  clientMemoryContext?: string;
}): Promise<AggregatorTurnResult> {
  let text: string;
  let replySource: 'ai' | 'fallback' = 'fallback';

  if (input.mode === 'greeting') {
    text = input.agent.greeting.trim() || `Hi! I'm ${input.agent.name}.`;
    replySource = 'fallback';
  } else {
    const reply = await generateAgentReply({
      agentType: input.agentType,
      systemPersona: input.agent.persona,
      history: input.history,
      userMessage: input.userMessage ?? '',
      clientMemoryContext: input.clientMemoryContext,
    });
    text = reply.content;
    replySource = reply.source;
  }

  const media = await renderAgentSpeech({
    agentType: input.agentType,
    agentId: input.agentId,
    sessionId: input.sessionId,
    text,
    avatarUrl: input.agent.avatarUrl,
    voiceId: input.agent.voiceId,
  });

  return {
    text,
    replySource,
    audioMime: media.audioMime,
    audioBase64: media.audioBase64,
    videoUrl: media.videoUrl,
    avatarUrl: media.avatarUrl,
    mediaSource: media.source,
  };
}

export async function runConversationTurn(input: {
  agentType: AgentType;
  agentId: string;
  sessionId: string;
  mode: 'greeting' | 'reply';
  agent: AvatarAgentDefinition;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage?: string;
  clientMemoryContext?: string;
}): Promise<AggregatorTurnResult> {
  const fromAgg = await conversationTurnViaAggregator(input);
  if (fromAgg) {
    if (fromAgg.mediaSource === 'none') {
      const media = await renderAgentSpeech({
        agentType: input.agentType,
        agentId: input.agentId,
        sessionId: input.sessionId,
        text: fromAgg.text,
        avatarUrl: fromAgg.avatarUrl ?? input.agent.avatarUrl,
        voiceId: input.agent.voiceId,
      });
      return {
        ...fromAgg,
        audioMime: media.audioMime,
        audioBase64: media.audioBase64,
        videoUrl: media.videoUrl,
        avatarUrl: media.avatarUrl ?? fromAgg.avatarUrl,
        mediaSource: media.source,
      };
    }
    return fromAgg;
  }
  return conversationTurnLocal(input);
}

export function avatarMediaCapabilities(agent: AvatarAgentDefinition): {
  voice: boolean;
  video: boolean;
  ai: boolean;
  aggregator: boolean;
} {
  const agg = useAiAggregatorForAvatars();
  const hasTts = listConfiguredTtsProviders().length > 0;
  const voice = agg || hasTts;
  const video = agg || avatarVideoCapable(agent.avatarUrl);
  return {
    voice,
    video: Boolean(video && agent.avatarUrl.trim()),
    ai: getAiClient().isConfigured(),
    aggregator: agg,
  };
}

export { listAvatarMediaStackStatus } from '../providers/avatar-video-render.provider';
