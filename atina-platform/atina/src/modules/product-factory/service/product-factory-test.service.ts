import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../../../config';
import type { ProductFactoryProjectRow } from '../repository/product-factory.repository';
import { GreenfieldBuilderService } from './greenfield-builder.service';

export type ProductFactoryTestResult = {
  passed: boolean;
  outputLines: number;
  checks: string[];
  error?: string;
};

export class ProductFactoryTestService {
  private readonly builder = new GreenfieldBuilderService();

  runStructuralChecks(row: ProductFactoryProjectRow): string[] {
    const root = row.output_dir ?? this.builder.projectDir(row);
    const enhanced =
      row.deliverable_id === 'custom-software' ||
      (row.metadata as Record<string, unknown> | null)?.enhancedGreenfield === true;
    const required = enhanced
      ? [
          'package.json',
          'src/server.js',
          'src/routes/api.js',
          'public/index.html',
          'tests/enhanced.test.js',
          '.factory-meta.json',
        ]
      : [
          'package.json',
          'src/index.js',
          'src/config.js',
          'tests/smoke.test.js',
          '.factory-meta.json',
        ];
    const missing = required.filter((rel) => !fs.existsSync(path.join(root, rel)));
    if (missing.length) {
      throw new Error(`Missing scaffold files: ${missing.join(', ')}`);
    }

    const meta = JSON.parse(fs.readFileSync(path.join(root, '.factory-meta.json'), 'utf8')) as {
      isolationKey?: string;
      lane?: string;
    };
    if (meta.isolationKey !== row.isolation_key) {
      throw new Error('Isolation key mismatch in .factory-meta.json');
    }
    if (meta.lane !== row.lane) {
      throw new Error('Lane mismatch in .factory-meta.json');
    }

    return ['structure_ok', 'isolation_meta_ok'];
  }

  runTests(row: ProductFactoryProjectRow): ProductFactoryTestResult {
    const root = row.output_dir ?? this.builder.projectDir(row);
    const enhanced =
      row.deliverable_id === 'custom-software' ||
      (row.metadata as Record<string, unknown> | null)?.enhancedGreenfield === true;
    const checks = this.runStructuralChecks(row);

    if (!config.productFactory.runTestsOnBuild) {
      return { passed: true, outputLines: 0, checks: [...checks, 'tests_skipped'] };
    }

    try {
      const testFile = enhanced ? 'tests/enhanced.test.js' : 'tests/smoke.test.js';
      const out = execSync(`node --test ${testFile}`, {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60_000,
      });
      return {
        passed: true,
        outputLines: out.split('\n').length,
        checks: [...checks, 'node_test_ok'],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        passed: false,
        outputLines: 0,
        checks,
        error: message,
      };
    }
  }
}
