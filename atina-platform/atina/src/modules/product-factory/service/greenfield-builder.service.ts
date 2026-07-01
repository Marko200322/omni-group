import fs from 'fs';
import path from 'path';
import { config } from '../../../config';
import type { ProductFactoryProjectRow } from '../repository/product-factory.repository';
import {
  renderConfigJs,
  renderFactoryMeta,
  renderIndexJs,
  renderPackageJson,
  renderReadme,
  renderSmokeTestJs,
  type GreenfieldSpec,
} from '../lib/greenfield-templates';
import {
  renderEnhancedPackageJson,
  renderEnhancedServerJs,
  renderApiRoutesJs,
  renderDbSchemaSql,
  renderPublicIndexHtml,
  renderEnhancedReadme,
  renderEnhancedSmokeTestJs,
} from '../lib/greenfield-enhanced-templates';

export type GreenfieldBuildResult = {
  outputDir: string;
  filesWritten: string[];
  isolationKey: string;
  lane: string;
};

export class GreenfieldBuilderService {
  outputRoot(): string {
    return path.resolve(process.cwd(), config.productFactory.outputDir);
  }

  projectDir(row: ProductFactoryProjectRow): string {
    return path.join(this.outputRoot(), row.lane, row.isolation_key);
  }

  build(row: ProductFactoryProjectRow): GreenfieldBuildResult {
    const spec: GreenfieldSpec = {
      projectName: row.name,
      slug: row.slug,
      lane: row.lane,
      isolationKey: row.isolation_key,
      description: row.description ?? row.name,
      clientName: row.client_name,
    };

    const enhanced =
      row.deliverable_id === 'custom-software' ||
      (row.metadata as Record<string, unknown> | null)?.enhancedGreenfield === true;

    const root = this.projectDir(row);
    if (enhanced) {
      return this.buildEnhanced(root, spec);
    }

    const srcDir = path.join(root, 'src');
    const testsDir = path.join(root, 'tests');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(testsDir, { recursive: true });

    const files: Array<[string, string]> = [
      [path.join(root, 'package.json'), renderPackageJson(spec)],
      [path.join(srcDir, 'index.js'), renderIndexJs(spec)],
      [path.join(srcDir, 'config.js'), renderConfigJs(spec)],
      [path.join(testsDir, 'smoke.test.js'), renderSmokeTestJs(spec)],
      [path.join(root, 'README.md'), renderReadme(spec)],
      [path.join(root, '.factory-meta.json'), renderFactoryMeta(spec)],
    ];

    const written: string[] = [];
    for (const [file, content] of files) {
      fs.writeFileSync(file, content, 'utf8');
      written.push(file);
    }

    return {
      outputDir: root,
      filesWritten: written,
      isolationKey: row.isolation_key,
      lane: row.lane,
    };
  }

  private buildEnhanced(root: string, spec: GreenfieldSpec): GreenfieldBuildResult {
    const srcDir = path.join(root, 'src');
    const routesDir = path.join(srcDir, 'routes');
    const dbDir = path.join(srcDir, 'db');
    const publicDir = path.join(root, 'public');
    const testsDir = path.join(root, 'tests');
    for (const d of [srcDir, routesDir, dbDir, publicDir, testsDir]) {
      fs.mkdirSync(d, { recursive: true });
    }

    const files: Array<[string, string]> = [
      [path.join(root, 'package.json'), renderEnhancedPackageJson(spec)],
      [path.join(srcDir, 'server.js'), renderEnhancedServerJs(spec)],
      [path.join(srcDir, 'config.js'), renderConfigJs(spec)],
      [path.join(routesDir, 'api.js'), renderApiRoutesJs(spec)],
      [path.join(dbDir, 'schema.sql'), renderDbSchemaSql(spec)],
      [path.join(publicDir, 'index.html'), renderPublicIndexHtml(spec)],
      [path.join(testsDir, 'enhanced.test.js'), renderEnhancedSmokeTestJs(spec)],
      [path.join(root, 'README.md'), renderEnhancedReadme(spec)],
      [path.join(root, '.factory-meta.json'), renderFactoryMeta({ ...spec, lane: spec.lane })],
    ];

    const written: string[] = [];
    for (const [file, content] of files) {
      fs.writeFileSync(file, content, 'utf8');
      written.push(file);
    }

    return {
      outputDir: root,
      filesWritten: written,
      isolationKey: spec.isolationKey,
      lane: spec.lane,
    };
  }

  /** Provera da drugi projekat ne piše u isti folder. */
  assertIsolated(row: ProductFactoryProjectRow, other: ProductFactoryProjectRow): void {
    if (row.isolation_key === other.isolation_key) {
      throw new Error('Isolation key collision');
    }
    if (row.lane !== other.lane && row.slug === other.slug) {
      // slug može biti isti samo ako su različiti lane + isolation
      return;
    }
    const a = this.projectDir(row);
    const b = this.projectDir(other);
    if (path.resolve(a) === path.resolve(b)) {
      throw new Error('Output path collision between projects');
    }
  }
}
