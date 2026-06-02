import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../../../config';
import { NotFoundError } from '../../../utils/errors';
import type { GenerateVerticalDtoType } from '../dto/autonomy-loop.dto';
import { AutonomyLoopRepository } from '../repository/autonomy-loop.repository';
import {
  renderVerticalModuleTs,
  renderVerticalPageTsx,
  renderVerticalWorkflowJson,
} from '../templates/vertical-templates';

export class ModuleGeneratorService {
  private readonly repo = new AutonomyLoopRepository();

  private outputRoot(): string {
    return path.resolve(process.cwd(), config.autonomy.generatedDir);
  }

  async generate(slug: string, dto: GenerateVerticalDtoType) {
    const { rows } = await this.repo.getVerticalBySlug(slug);
    const vertical = rows[0];
    if (!vertical) throw new NotFoundError('Industry vertical');

    const research = (vertical.research_data ?? {}) as Record<string, unknown>;
    const vars = {
      slug,
      name: vertical.name,
      category: vertical.category,
      keywords: Array.isArray(research.keywords) ? (research.keywords as string[]).join(', ') : vertical.category,
      valueProp:
        typeof research.value_proposition === 'string'
          ? research.value_proposition
          : `Automation for ${vertical.name}`,
    };

    const root = path.join(this.outputRoot(), slug);
    fs.mkdirSync(root, { recursive: true });

    const artifacts: Array<Record<string, unknown>> = [];

    const modulePath = path.join(root, `${slug}.module.ts`);
    const moduleContent = renderVerticalModuleTs(vars);
    fs.writeFileSync(modulePath, moduleContent, 'utf8');
    artifacts.push(await this.recordArtifact(slug, 'module_ts', modulePath, moduleContent));

    if (dto.includePage) {
      const pagePath = path.join(root, `${slug}-page.tsx`);
      const pageContent = renderVerticalPageTsx(vars);
      fs.writeFileSync(pagePath, pageContent, 'utf8');
      artifacts.push(await this.recordArtifact(slug, 'page_tsx', pagePath, pageContent));
    }

    if (dto.includeWorkflow) {
      const workflowPath = path.join(root, `${slug}-workflow.json`);
      const workflowContent = renderVerticalWorkflowJson(vars);
      fs.writeFileSync(workflowPath, workflowContent, 'utf8');
      artifacts.push(await this.recordArtifact(slug, 'workflow_json', workflowPath, workflowContent));
    }

    await this.repo.updateVerticalStatus(slug, 'ready', {
      generated_at: new Date().toISOString(),
      artifact_count: artifacts.length,
      output_dir: root,
    });

    return { verticalSlug: slug, outputDir: root, artifacts };
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
