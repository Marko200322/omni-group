import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../../../config';
import logger from '../../../utils/logger';
import type { DeployTriggerPayload } from '../../../integrations/infrastructure-client';

/** Kad nema INFRASTRUCTURE agregatora — lokalni deploy-prep (test + git status). */
export class LocalInfrastructureService {
  isAvailable(): boolean {
    return config.aggregators.infrastructureLocalFallback;
  }

  triggerDeploy(payload: DeployTriggerPayload): Record<string, unknown> {
    const repoPath = config.autonomy.gitRepoPath
      ? path.resolve(config.autonomy.gitRepoPath)
      : path.resolve(process.cwd(), '..', '..');

    const steps: Array<Record<string, unknown>> = [];

    if (config.autonomy.evolutionRunTestsOnDeploy) {
      try {
        execSync('npm run test:unit -- --testPathPatterns=autonomy-loop', {
          cwd: path.resolve(process.cwd()),
          stdio: 'pipe',
          encoding: 'utf8',
          timeout: 120_000,
        });
        steps.push({ step: 'npm_test_unit_autonomy', status: 'ok' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn('Local infrastructure: unit tests failed', { error: msg.slice(0, 500) });
        steps.push({ step: 'npm_test_unit_autonomy', status: 'failed', error: msg.slice(0, 500) });
      }
    }

    let gitClean = false;
    if (fs.existsSync(path.join(repoPath, '.git'))) {
      try {
        const status = execSync('git status --porcelain', { cwd: repoPath, encoding: 'utf8' });
        gitClean = status.trim().length === 0;
        steps.push({ step: 'git_status', status: 'ok', clean: gitClean, dirtyFiles: status.trim().split('\n').filter(Boolean).length });
      } catch (err) {
        steps.push({
          step: 'git_status',
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      steps.push({ step: 'git_status', status: 'skipped', reason: 'no_git_repo' });
    }

    return {
      local: true,
      simulated: false,
      phase: payload.phase,
      notes: payload.notes,
      repoPath,
      steps,
      readyForRemoteDeploy: steps.every((s) => s.status !== 'failed'),
    };
  }
}
