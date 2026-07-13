import { execSync } from 'child_process';
import { config } from '../../../config';
import logger from '../../../utils/logger';
import { PlatformEvolutionService, type PlatformEvolutionTaskType } from './platform-evolution.service';
import { LocalInfrastructureService } from './local-infrastructure.service';
import { PlatformEvolutionCodeService } from './platform-evolution-code.service';
import { syncGeneratedVerticalsIndexFromDb } from './platform-evolution-catalog-sync.service';
import { CursorAgentService } from '../../cursor-agent/service/cursor-agent.service';

export class PlatformEvolutionTickService {
  private readonly evolution = new PlatformEvolutionService();
  private readonly code = new PlatformEvolutionCodeService();
  private readonly cursor = new CursorAgentService();

  async tick(userId: string | null) {
    await this.evolution.seedDefaultTasksIfEmpty();
    const pending = await this.evolution.listPending(5);
    const results: Array<Record<string, unknown>> = [];

    for (const task of pending) {
      await this.evolution.markRunning(task.id);
      try {
        const result = await this.executeTask(task.task_type as PlatformEvolutionTaskType, task.target_paths, userId);
        await this.evolution.markCompleted(task.id, result);
        results.push({ id: task.id, task_type: task.task_type, status: 'completed', result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn('Platform evolution task failed', { taskId: task.id, error: message });
        await this.evolution.markFailed(task.id, message);
        results.push({ id: task.id, task_type: task.task_type, status: 'failed', error: message });
      }
    }

    return { processed: results.length, results, userId };
  }

  private async executeTask(
    type: PlatformEvolutionTaskType,
    targetPaths: string[],
    userId: string | null,
  ): Promise<Record<string, unknown>> {
    const cursorTypes: PlatformEvolutionTaskType[] = [
      'ui_improvement',
      'research_gap',
      'test_fix',
    ];
    if (cursorTypes.includes(type)) {
      const cursorRun = await this.cursor.runEvolutionTask(userId, type, targetPaths);
      if (cursorRun.started) {
        return { ...cursorRun, via: 'cursor_sdk' };
      }
    }

    const codeResult = this.code.apply(type, targetPaths);
    if (codeResult.applied) {
      return { ...codeResult, via: 'code_agent' };
    }

    switch (type) {
      case 'catalog_sync':
        return syncGeneratedVerticalsIndexFromDb();
      case 'test_fix':
        return this.runTestGate();
      case 'deploy_prep':
        return this.runDeployPrep();
      case 'outreach_tune':
        return {
          action: 'config_check',
          warmupComplete: config.outreach.domainWarmupComplete,
          devSendToFallback: config.outreach.devSendToFallback,
          fallbackEmailSet: Boolean(config.outreach.fallbackNotifyEmail?.trim()),
          commsOrSmtp: true,
          codeNotes: codeResult.notes,
        };
      case 'ui_improvement':
      case 'research_gap':
        return { action: 'logged', targetPaths, codeNotes: codeResult.notes };
      default:
        return { action: 'noop', type, codeNotes: codeResult.notes };
    }
  }

  private runTestGate(): Record<string, unknown> {
    if (!config.autonomy.evolutionRunTestsOnDeploy) {
      return { skipped: true, reason: 'AUTONOMY_EVOLUTION_RUN_TESTS=false' };
    }
    const out = execSync('npm run test:unit -- --testPathPatterns=autonomy-loop', {
      cwd: process.cwd(),
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 180_000,
    });
    return { tests: 'autonomy-loop unit', ok: true, outputLines: out.split('\n').length };
  }

  private runDeployPrep(): Record<string, unknown> {
    const local = new LocalInfrastructureService();
    if (!local.isAvailable()) {
      return { skipped: true, reason: 'INFRASTRUCTURE_LOCAL_FALLBACK=false' };
    }
    return local.triggerDeploy({ phase: 'evolution', notes: 'Platform evolution deploy prep' });
  }
}
