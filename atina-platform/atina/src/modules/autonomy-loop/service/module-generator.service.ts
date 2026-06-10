import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../../../config';
import { NotFoundError } from '../../../utils/errors';
import { resolveVerticalSlug } from '../../../shared/industry/industry-catalog';
import type { GenerateVerticalDtoType } from '../dto/autonomy-loop.dto';
import { resolveVerticalDeliveryPack } from '../lib/vertical-delivery-resolver';
import { AutonomyLoopRepository } from '../repository/autonomy-loop.repository';
import { OutboundQueueService } from './outbound-queue.service';
import {
  deliveryPackToTemplateVars,
  renderDeliverablePackJson,
  renderOutreachEmailMarkdown,
  renderQualityChecklistJson,
  renderVerticalModuleTs,
  renderVerticalPageTsx,
  renderVerticalWorkflowJson,
} from '../templates/vertical-templates';

export class ModuleGeneratorService {
  private readonly repo = new AutonomyLoopRepository();
  private readonly outbound = new OutboundQueueService();

  private outputRoot(): string {
    return path.resolve(process.cwd(), config.autonomy.generatedDir);
  }

  async generate(slug: string, dto: GenerateVerticalDtoType, userId?: string | null) {
    const { rows } = await this.repo.getVerticalBySlug(slug);
    const vertical = rows[0];
    if (!vertical) throw new NotFoundError('Industry vertical');

    const research = (vertical.research_data ?? {}) as Record<string, unknown>;
    const resolved = resolveVerticalSlug(slug);
    const pack = resolveVerticalDeliveryPack({
      slug,
      category: String(vertical.category),
      subtype: resolved?.subtype ?? null,
      name: String(vertical.name),
      researchData: research,
    });
    const vars = deliveryPackToTemplateVars(pack);

    const root = path.join(this.outputRoot(), slug);
    fs.mkdirSync(root, { recursive: true });

    const artifacts: Array<Record<string, unknown>> = [];

    const modulePath = path.join(root, `${slug}.module.ts`);
    const moduleContent = renderVerticalModuleTs(vars);
    fs.writeFileSync(modulePath, moduleContent, 'utf8');
    artifacts.push(await this.recordArtifact(slug, 'module_ts', modulePath, moduleContent));

    if (dto.includePage !== false) {
      const pagePath = path.join(root, `${slug}-page.tsx`);
      const pageContent = renderVerticalPageTsx(vars);
      fs.writeFileSync(pagePath, pageContent, 'utf8');
      artifacts.push(await this.recordArtifact(slug, 'page_tsx', pagePath, pageContent));
    }

    if (dto.includeWorkflow !== false) {
      const workflowPath = path.join(root, `${slug}-workflow.json`);
      const workflowContent = renderVerticalWorkflowJson(pack);
      fs.writeFileSync(workflowPath, workflowContent, 'utf8');
      artifacts.push(await this.recordArtifact(slug, 'workflow_json', workflowPath, workflowContent));
    }

    if (dto.includeOutreach !== false) {
      const outreachPath = path.join(root, `${slug}-outreach.md`);
      const outreachContent = renderOutreachEmailMarkdown(pack);
      fs.writeFileSync(outreachPath, outreachContent, 'utf8');
      artifacts.push(await this.recordArtifact(slug, 'outreach_md', outreachPath, outreachContent));
    }

    if (dto.includeQualityPack !== false) {
      const qualityPath = path.join(root, `${slug}-quality.json`);
      const qualityContent = renderQualityChecklistJson(pack);
      fs.writeFileSync(qualityPath, qualityContent, 'utf8');
      artifacts.push(await this.recordArtifact(slug, 'quality_json', qualityPath, qualityContent));
    }

    if (dto.includeDeliverablePack !== false) {
      const deliverablePath = path.join(root, `${slug}-deliverables.json`);
      const deliverableContent = renderDeliverablePackJson(pack);
      fs.writeFileSync(deliverablePath, deliverableContent, 'utf8');
      artifacts.push(await this.recordArtifact(slug, 'deliverables_json', deliverablePath, deliverableContent));
    }

    await this.repo.updateVerticalStatus(slug, 'ready', {
      generated_at: new Date().toISOString(),
      artifact_count: artifacts.length,
      output_dir: root,
      delivery_pack: {
        verticalSlug: pack.verticalSlug,
        category: pack.category,
        verticalPackageQuoteEur: pack.verticalPackageQuoteEur,
        deliverableIds: pack.recommendedDeliverables.map((d) => d.id),
        coreModules: pack.coreModules,
      },
    });

    let outboundDraft: Record<string, unknown> | null = null;
    if (dto.queueOutbound !== false && dto.includeOutreach !== false) {
      const draft = await this.outbound.createDraftFromVertical({
        userId,
        verticalSlug: slug,
        category: String(vertical.category),
        name: String(vertical.name),
        researchData: research,
        source: 'module_generate',
      });
      outboundDraft = draft as unknown as Record<string, unknown>;
    }

    return { verticalSlug: slug, outputDir: root, artifacts, deliveryPack: pack, outboundDraft };
  }

  private async recordArtifact(
    verticalSlug: string,
    artifactType: string,
    filePath: string,
    content: string
  ) {
    const hash = createHash('sha256').update(content).digest('hex');
    const { rows } = await this.repo.insertArtifact(verticalSlug, artifactType, filePath, hash, {
      bytes: Buffer.byteLength(content, 'utf8'),
    });
    return rows[0] as Record<string, unknown>;
  }
}
