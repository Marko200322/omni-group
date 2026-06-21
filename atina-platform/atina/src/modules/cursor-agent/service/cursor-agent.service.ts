import path from 'path';
import { config } from '../../../config';
import logger from '../../../utils/logger';
import { WebPushService } from '../../admin/service/web-push.service';
import { CursorAgentRepository } from '../repository/cursor-agent.repository';

function repoRoot(): string {
  if (config.autonomy.gitRepoPath?.trim()) {
    return path.resolve(config.autonomy.gitRepoPath);
  }
  if (config.cursor.repoPath?.trim()) {
    return path.resolve(config.cursor.repoPath);
  }
  return path.resolve(process.cwd(), '..', '..');
}

function buildEvolutionPrompt(taskType: string, targetPaths: string[]): string {
  const targets = targetPaths.length ? targetPaths.join(', ') : 'monorepo defaults';
  const rules =
    'Work only inside apps/omnigroup-web/src/, atina-platform/atina/, or docs. ' +
    'Keep changes minimal. Match existing code style. Run relevant unit tests if you change backend logic.';

  switch (taskType) {
    case 'ui_improvement':
      return (
        `Improve the Omni Group operator UI for task "${taskType}". Targets: ${targets}. ${rules} ` +
        'Focus on mobile admin (/admin/mobile) and platform panels if relevant.'
      );
    case 'research_gap':
      return (
        `Close a platform research gap for "${taskType}". Targets: ${targets}. ${rules} ` +
        'Document findings in atina-platform/atina/docs/operations/EVOLUTION-AGENT-LOG.md if needed.'
      );
    case 'test_fix':
      return (
        `Fix failing or missing tests for "${taskType}". Targets: ${targets}. ${rules} ` +
        'Prefer npm run test:unit with focused testPathPatterns.'
      );
    default:
      return `Platform evolution task "${taskType}" on targets: ${targets}. ${rules}`;
  }
}

export class CursorAgentService {
  private readonly repo = new CursorAgentRepository();
  private readonly push = new WebPushService();

  isConfigured(): boolean {
    return Boolean(config.cursor.apiKey?.trim());
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      model: config.cursor.model,
      runtime: config.cursor.runtime,
      repoPath: repoRoot(),
      evolutionEnabled: config.cursor.evolutionEnabled,
    };
  }

  async listRuns(limit = 20) {
    const rows = await this.repo.listRecent(limit);
    return rows.map((r) => ({
      id: r.id,
      source: r.source,
      prompt: r.prompt.slice(0, 240),
      status: r.status,
      agentId: r.agent_id,
      runId: r.run_id,
      resultSummary: r.result_summary,
      errorMessage: r.error_message,
      createdAt: r.created_at,
      completedAt: r.completed_at,
    }));
  }

  async runPrompt(
    userId: string,
    prompt: string,
    source: 'manual' | 'mobile' | 'evolution' = 'manual',
  ) {
    if (!this.isConfigured()) {
      return { started: false, reason: 'CURSOR_API_KEY not set' };
    }

    const row = await this.repo.insert({ userId, source, prompt: prompt.trim() });
    const result = await this.executeRun(row.id, prompt.trim(), userId, source);
    return { started: true, runId: row.id, ...result };
  }

  async runEvolutionTask(
    userId: string | null,
    taskType: string,
    targetPaths: string[],
  ): Promise<{ started: boolean; via?: string; reason?: string; runId?: string; status?: string }> {
    if (!this.isConfigured() || !config.cursor.evolutionEnabled) {
      return { started: false, reason: 'cursor_not_configured' };
    }
    const prompt = buildEvolutionPrompt(taskType, targetPaths);
    const row = await this.repo.insert({ userId, source: 'evolution', prompt });
    const result = await this.executeRun(row.id, prompt, userId, 'evolution');
    return { started: true, via: 'cursor_sdk', runId: row.id, ...result };
  }

  private async executeRun(
    dbId: string,
    prompt: string,
    userId: string | null,
    source: string,
  ): Promise<{ status: string; agentId?: string; summary?: string; error?: string }> {
    const apiKey = config.cursor.apiKey.trim();
    const cwd = repoRoot();

    try {
      const { Agent, CursorAgentError } = await import('@cursor/sdk');
      await this.repo.markRunning(dbId);

      const options: Record<string, unknown> = {
        apiKey,
        model: { id: config.cursor.model },
      };

      if (config.cursor.runtime === 'cloud' && config.cursor.cloudRepo?.trim()) {
        options.cloud = {
          repos: [{ url: config.cursor.cloudRepo.trim() }],
        };
      } else {
        options.local = { cwd, settingSources: [] };
      }

      const outcome = await Agent.prompt(prompt, options as never);
      const outcomeRecord = outcome as unknown as Record<string, unknown>;
      const runId = typeof outcome.id === 'string' ? outcome.id : undefined;
      const agentId =
        typeof outcomeRecord.agentId === 'string' ? String(outcomeRecord.agentId) : undefined;

      if (outcome.status === 'error') {
        const msg = 'Cursor run finished with error status';
        await this.repo.markError(dbId, msg, agentId, runId);
        await this.notifyComplete(userId, source, 'error', prompt);
        return { status: 'error', agentId, error: msg };
      }

      const summary = (outcome.result ?? 'Run completed').slice(0, 8000);
      await this.repo.markFinished(dbId, summary, agentId, runId);
      await this.notifyComplete(userId, source, 'finished', prompt);
      logger.info('Cursor agent run completed', { dbId, agentId, runId, source });
      return { status: 'finished', agentId, summary: summary.slice(0, 500) };
    } catch (err) {
      const isCursor = err && typeof err === 'object' && (err as { name?: string }).name === 'CursorAgentError';
      const message = err instanceof Error ? err.message : String(err);
      await this.repo.markError(dbId, message);
      await this.notifyComplete(userId, source, 'error', prompt);
      logger.warn('Cursor agent run failed', { dbId, source, error: message, cursorError: isCursor });
      return { status: 'error', error: message };
    }
  }

  private async notifyComplete(
    userId: string | null,
    source: string,
    status: 'finished' | 'error',
    prompt: string,
  ): Promise<void> {
    const title = status === 'finished' ? 'Cursor coding done' : 'Cursor coding failed';
    const body =
      source === 'mobile'
        ? `Your task: ${prompt.slice(0, 80)}…`
        : `${source}: ${prompt.slice(0, 72)}…`;
    try {
      if (userId) {
        await this.push.sendToUser(userId, { title, body, url: '/admin/mobile', tag: 'cursor-run' });
      } else {
        await this.push.notifyAdmins({ title, body, url: '/admin/mobile', tag: 'cursor-run' });
      }
    } catch {
      /* push is best-effort */
    }
  }
}
