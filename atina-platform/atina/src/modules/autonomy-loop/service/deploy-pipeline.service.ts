import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../../../config';
import { getInfrastructureClient } from '../../../integrations';
import { NotFoundError } from '../../../utils/errors';
import type { DeployVerticalDtoType } from '../dto/autonomy-loop.dto';
import { AutonomyLoopRepository } from '../repository/autonomy-loop.repository';

export class DeployPipelineService {
  private readonly repo = new AutonomyLoopRepository();
  private readonly infrastructure = getInfrastructureClient();

  async deploy(slug: string, dto: DeployVerticalDtoType, actorUserId?: string) {
    const { rows } = await this.repo.getVerticalBySlug(slug);
    const vertical = rows[0];
    if (!vertical) throw new NotFoundError('Industry vertical');

    const { rows: artifacts } = await this.repo.listArtifacts(slug);
    if (!artifacts.length) {
      throw new NotFoundError('Generated artifacts — run generate first');
    }

    const { rows: jobRows } = await this.repo.createDeployJob(slug, {
      gitCommit: dto.gitCommit,
      triggerCi: dto.triggerCi,
      notes: dto.notes ?? null,
      artifactCount: artifacts.length,
    });
    const jobId = jobRows[0]?.id as string;

    let gitCommitSha: string | null = null;
    let deployResult: Record<string, unknown> | null = null;
    const errors: string[] = [];

    if (dto.gitCommit && config.autonomy.gitRepoPath) {
      try {
        gitCommitSha = this.gitCommitVertical(slug, dto.notes);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    if (dto.triggerCi && this.infrastructure.isConfigured()) {
      try {
        deployResult = await this.infrastructure.triggerDeploy({
          phase: 'autonomy',
          notes: dto.notes ?? `Deploy vertical ${slug}`,
          actorUserId,
        });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    } else if (dto.triggerCi && !this.infrastructure.isConfigured()) {
      deployResult = {
        simulated: true,
        message: 'Infrastructure aggregator not configured — deploy queued locally',
        verticalSlug: slug,
      };
    }

    const status = errors.length ? 'failed' : gitCommitSha || deployResult ? 'completed' : 'queued';
    await this.repo.finishDeployJob(jobId, status, gitCommitSha, errors.join('; ') || undefined);
    await this.repo.updateVerticalStatus(slug, status === 'failed' ? 'ready' : 'deployed', {
      last_deploy_at: new Date().toISOString(),
      git_commit_sha: gitCommitSha,
      deploy_result: deployResult,
    });

    return {
      jobId,
      verticalSlug: slug,
      status,
      gitCommitSha,
      deployResult,
      errors,
    };
  }

  private gitCommitVertical(slug: string, notes?: string): string {
    const repoPath = path.resolve(config.autonomy.gitRepoPath);
    if (!fs.existsSync(repoPath)) {
      throw new Error(`AUTONOMY_GIT_REPO_PATH does not exist: ${repoPath}`);
    }
    const generatedDir = path.resolve(process.cwd(), config.autonomy.generatedDir, slug);
    if (!fs.existsSync(generatedDir)) {
      throw new Error(`Generated directory missing for ${slug}`);
    }

    const relDest = path.join('data', 'generated-verticals', slug);
    const absDest = path.join(repoPath, relDest);
    fs.mkdirSync(path.dirname(absDest), { recursive: true });
    fs.cpSync(generatedDir, absDest, { recursive: true });

    const message = notes?.trim() || `autonomy: deploy vertical ${slug}`;
    execSync('git add -A', { cwd: repoPath, stdio: 'pipe' });
    try {
      execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: repoPath, stdio: 'pipe' });
    } catch {
      /* nothing to commit */
    }
    const sha = execSync('git rev-parse HEAD', { cwd: repoPath, encoding: 'utf8' }).trim();
    return sha;
  }
}
