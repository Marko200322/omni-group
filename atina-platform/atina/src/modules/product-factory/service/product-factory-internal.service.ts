import { getAiClient } from '../../../integrations';
import { config } from '../../../config';
import type { ProductFactoryProjectRow } from '../repository/product-factory.repository';
import { ProductFactoryRepository } from '../repository/product-factory.repository';
import { GreenfieldBuilderService } from './greenfield-builder.service';
import { ProductFactoryTestService } from './product-factory-test.service';

/** Sloj 3 — autonomy istražuje i gradi interne SaaS proizvode (odvojeno od client_order). */
export class ProductFactoryInternalService {
  private readonly repo = new ProductFactoryRepository();
  private readonly builder = new GreenfieldBuilderService();
  private readonly tester = new ProductFactoryTestService();

  async tick(ownerUserId: string, maxProjects = 1) {
    if (!config.productFactory.enabled || !config.productFactory.internalLaneEnabled) {
      return { processed: 0, results: [], skipped: true as const, reason: 'internal_lane_disabled' };
    }

    const picks = await this.repo.pickInternalForTick(ownerUserId, maxProjects);
    const results: Array<Record<string, unknown>> = [];

    for (const project of picks) {
      const runId = await this.repo.insertBuildRun(project.id, 'internal_research');
      try {
        const researched = await this.researchProject(project);
        await this.repo.updateProject(project.id, {
          status: 'building',
          metadata: researched.metadata,
          description: researched.description ?? project.description,
          last_error: null,
        });

        const fresh = (await this.repo.getById(project.id, ownerUserId))!;
        const build = this.builder.build(fresh);
        await this.repo.updateProject(project.id, {
          status: 'built',
          output_dir: build.outputDir,
          deploy_status: 'pending',
        });

        const built = (await this.repo.getById(project.id, ownerUserId))!;
        const test = this.tester.runTests(built);
        await this.repo.updateProject(project.id, {
          status: test.passed ? 'tested' : 'failed',
          test_status: test.passed ? 'passed' : 'failed',
          deploy_status: test.passed ? 'ready' : 'pending',
          last_error: test.error ?? null,
          metadata: {
            ...(built.metadata ?? {}),
            lastTest: test,
          },
        });

        await this.repo.completeBuildRun(runId, 'completed', {
          research: researched.researchSummary,
          build,
          test,
        });
        results.push({
          projectId: project.id,
          slug: project.slug,
          status: test.passed ? 'tested' : 'failed',
          isolationKey: project.isolation_key,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.repo.updateProject(project.id, { status: 'failed', last_error: message });
        await this.repo.completeBuildRun(runId, 'failed', null, message);
        results.push({ projectId: project.id, slug: project.slug, status: 'failed', error: message });
      }
    }

    return { processed: results.length, results, lane: 'internal_saas' as const };
  }

  private async researchProject(project: ProductFactoryProjectRow) {
    const meta = (project.metadata ?? {}) as Record<string, unknown>;
    const hypothesis =
      String(meta.marketHypothesis ?? project.description ?? project.name).trim();

    let researchSummary = `Internal SaaS hypothesis: ${hypothesis}`;
    const ai = getAiClient();
    if (ai.isConfigured()) {
      try {
        const rec = await ai.fetchRecommendations({
          mode: 'internal_saas_research',
          hypothesis,
          lane: 'internal_saas',
        });
        if (rec?.recommendations?.length) {
          researchSummary = rec.recommendations.slice(0, 3).join(' · ');
        }
      } catch {
        /* fallback to hypothesis */
      }
    }

    return {
      description: `${project.name} — ${researchSummary.slice(0, 500)}`,
      metadata: {
        ...meta,
        researchSummary,
        researchedAt: new Date().toISOString(),
        lane: 'internal_saas',
      },
      researchSummary,
    };
  }
}
