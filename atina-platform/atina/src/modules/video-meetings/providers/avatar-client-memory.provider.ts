import { getAiClient } from '../../../integrations';
import { config } from '../../../config';
import type { AgentType } from '../avatar/avatar-agent.personas';
import { AiMemoryRepository } from '../../ai-memory/repository/ai-memory.repository';

function memoryKey(agentType: AgentType, agentId: string): string {
  return `${agentType}:${agentId}`;
}

function parseContext(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return null;
}

export class AvatarClientMemoryProvider {
  private readonly repo = new AiMemoryRepository();

  enabled(): boolean {
    return config.videoMeetings.avatarMedia.clientMemoryEnabled;
  }

  async loadContext(
    userId: string,
    agentType: AgentType,
    agentId: string
  ): Promise<string> {
    if (!this.enabled()) return '';

    const namespace = 'avatar-client';
    const key = memoryKey(agentType, agentId);
    const likePattern = `memory:${namespace}:${key}%`;

    const { rows } = await this.repo.recallByLike(userId, likePattern);
    const snippets: string[] = [];

    for (const row of rows.slice(0, 5)) {
      const ctx = parseContext(row.context);
      const value = ctx?.value;
      if (value && typeof value === 'object') {
        const summary = (value as { summary?: string }).summary;
        if (summary?.trim()) snippets.push(summary.trim());
      }
    }

    const ai = getAiClient();
    if (ai.isConfigured()) {
      try {
        const remote = (await ai.recall(namespace, key, { timeoutMs: 2000, maxAttempts: 1 })) as
          | { summary?: string; notes?: string[] }
          | null;
        if (remote?.summary?.trim()) snippets.unshift(remote.summary.trim());
        if (Array.isArray(remote?.notes)) {
          for (const note of remote.notes.slice(0, 3)) {
            if (typeof note === 'string' && note.trim()) snippets.push(note.trim());
          }
        }
      } catch {
        // lokalna memorija je dovoljna
      }
    }

    if (snippets.length === 0) return '';
    const unique = [...new Set(snippets)].slice(0, 4);
    return `What you know about this client from earlier conversations:\n- ${unique.join('\n- ')}`;
  }

  rememberTurn(
    userId: string,
    agentType: AgentType,
    agentId: string,
    userMessage: string,
    assistantMessage: string
  ): void {
    if (!this.enabled()) return;

    const namespace = 'avatar-client';
    const key = memoryKey(agentType, agentId);
    const summary = `Client: "${userMessage.slice(0, 160)}" | Agent: "${assistantMessage.slice(0, 160)}"`;
    const value = {
      summary,
      agentType,
      agentId,
      updatedAt: new Date().toISOString(),
    };

    void this.repo
      .insertRemember(userId, `memory:${namespace}:${key}`, JSON.stringify({ namespace, key, value }))
      .catch(() => undefined);

    const ai = getAiClient();
    if (ai.isConfigured()) {
      void ai
        .remember({ namespace, key, value, userId })
        .catch(() => undefined);
    }
  }
}
