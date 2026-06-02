import { config } from '../../../config';
import type { AgentType } from './avatar-agent.personas';
import {
  type AvatarAgentDefinition,
  defaultAgents,
} from './avatar-agent.roster';
import {
  fetchRosterFromAggregator,
  useAiAggregatorForAvatars,
} from '../providers/avatar-ai-aggregator.provider';

const ROSTER_TTL_MS = 15 * 60 * 1000;

type CachedRoster = {
  expiresAt: number;
  agents: AvatarAgentDefinition[];
  source: 'aggregator' | 'system' | 'env';
};

const rosterCache = new Map<AgentType, CachedRoster>();

function parseAgentsJson(raw: string): AvatarAgentDefinition[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return null;
    const agents: AvatarAgentDefinition[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? '').trim();
      const name = String(row.name ?? '').trim();
      if (!id || !name) continue;
      agents.push({
        id,
        name,
        title: String(row.title ?? '').trim(),
        avatarUrl: String(row.avatarUrl ?? row.avatar_url ?? '').trim(),
        voiceId: String(row.voiceId ?? row.voice_id ?? '').trim(),
        persona: String(row.persona ?? '').trim(),
        greeting: String(row.greeting ?? '').trim(),
      });
    }
    return agents.length > 0 ? agents : null;
  } catch {
    return null;
  }
}

function applyLegacySingleAgent(agents: AvatarAgentDefinition[], agentType: AgentType): void {
  const legacy =
    agentType === 'support' ? config.videoMeetings.support : config.videoMeetings.sales;
  const hasLegacy =
    legacy.agentName.trim() ||
    legacy.agentAvatarUrl.trim() ||
    legacy.voiceId.trim() ||
    legacy.persona.trim() ||
    legacy.greeting.trim();
  if (!hasLegacy) return;

  const primaryId = agentType === 'support' ? 'mila' : 'nikola';
  const idx = agents.findIndex((a) => a.id === primaryId);
  const target = idx >= 0 ? agents[idx] : agents[0];
  if (!target) return;

  if (legacy.agentName.trim()) target.name = legacy.agentName.trim();
  if (legacy.agentTitle.trim()) target.title = legacy.agentTitle.trim();
  if (legacy.agentAvatarUrl.trim()) target.avatarUrl = legacy.agentAvatarUrl.trim();
  if (legacy.voiceId.trim()) target.voiceId = legacy.voiceId.trim();
  if (legacy.persona.trim()) target.persona = legacy.persona.trim();
  if (legacy.greeting.trim()) target.greeting = legacy.greeting.trim();
}

function systemDefaultRoster(agentType: AgentType): AvatarAgentDefinition[] {
  const agents = defaultAgents(agentType);
  applyLegacySingleAgent(agents, agentType);
  return agents;
}

export async function listAvatarAgentsAsync(agentType: AgentType): Promise<{
  agents: AvatarAgentDefinition[];
  source: 'aggregator' | 'system' | 'env';
}> {
  const jsonRaw =
    agentType === 'support'
      ? config.videoMeetings.supportAgentsJson
      : config.videoMeetings.salesAgentsJson;
  const fromEnv = parseAgentsJson(jsonRaw);
  if (fromEnv) {
    return { agents: fromEnv, source: 'env' };
  }

  const cached = rosterCache.get(agentType);
  if (cached && cached.expiresAt > Date.now()) {
    return { agents: cached.agents.map((a) => ({ ...a })), source: cached.source };
  }

  if (useAiAggregatorForAvatars()) {
    const fromAgg = await fetchRosterFromAggregator(agentType);
    if (fromAgg?.length) {
      rosterCache.set(agentType, {
        agents: fromAgg,
        expiresAt: Date.now() + ROSTER_TTL_MS,
        source: 'aggregator',
      });
      return { agents: fromAgg.map((a) => ({ ...a })), source: 'aggregator' };
    }
  }

  const agents = systemDefaultRoster(agentType);
  rosterCache.set(agentType, {
    agents,
    expiresAt: Date.now() + ROSTER_TTL_MS,
    source: 'system',
  });
  return { agents: agents.map((a) => ({ ...a })), source: 'system' };
}

/** Sync lista — koristi keš ili system default (ne zove agregator). */
export function listAvatarAgents(agentType: AgentType): AvatarAgentDefinition[] {
  const cached = rosterCache.get(agentType);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.agents.map((a) => ({ ...a }));
  }
  return systemDefaultRoster(agentType);
}

export function getAvatarAgent(agentType: AgentType, agentId?: string): AvatarAgentDefinition {
  const agents = listAvatarAgents(agentType);
  const id = agentId?.trim();
  if (id) {
    const found = agents.find((a) => a.id === id);
    if (found) return found;
  }
  return agents[0];
}

export function resetAvatarRosterCacheForTests(): void {
  rosterCache.clear();
}
