import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  renderPackageJson,
  renderSmokeTestJs,
  type GreenfieldSpec,
} from '../../../../modules/product-factory/lib/greenfield-templates';
import { GreenfieldBuilderService } from '../../../../modules/product-factory/service/greenfield-builder.service';
import { ProductFactoryTestService } from '../../../../modules/product-factory/service/product-factory-test.service';

jest.mock('../../../../config', () => ({
  config: {
    productFactory: {
      outputDir: path.join(os.tmpdir(), 'pf-test-out'),
      runTestsOnBuild: true,
    },
  },
}));

describe('product-factory greenfield', () => {
  const spec: GreenfieldSpec = {
    projectName: 'Test App',
    slug: 'test-app',
    lane: 'client_order',
    isolationKey: 'co-deadbeef',
    description: 'Isolated client order app',
    clientName: 'Acme',
  };

  it('renders package with isolation metadata', () => {
    const pkg = JSON.parse(renderPackageJson(spec)) as { factory: { isolationKey: string } };
    expect(pkg.factory.isolationKey).toBe('co-deadbeef');
  });

  it('builds scaffold and passes node --test', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-build-'));
    const row = {
      id: '00000000-0000-4000-8000-000000000001',
      owner_user_id: 'u1',
      lane: 'client_order' as const,
      slug: spec.slug,
      name: spec.projectName,
      description: spec.description,
      client_name: spec.clientName ?? null,
      client_email: null,
      deliverable_id: null,
      status: 'draft',
      isolation_key: spec.isolationKey,
      output_dir: null,
      test_status: 'pending',
      deploy_status: 'pending',
      metadata: {},
      last_error: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    jest.spyOn(GreenfieldBuilderService.prototype, 'outputRoot').mockReturnValue(tmp);
    const builder = new GreenfieldBuilderService();
    const built = builder.build(row);
    expect(fs.existsSync(path.join(built.outputDir, 'tests', 'smoke.test.js'))).toBe(true);

    const tester = new ProductFactoryTestService();
    const result = tester.runTests({ ...row, output_dir: built.outputDir });
    expect(result.passed).toBe(true);
    expect(result.checks).toContain('node_test_ok');
  });

  it('builds enhanced custom-software scaffold with env example and passing smoke tests', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-enhanced-'));
    const row = {
      id: '00000000-0000-4000-8000-000000000002',
      owner_user_id: 'u1',
      lane: 'client_order' as const,
      slug: 'acme-app',
      name: 'Acme Starter',
      description: 'Productized starter for Acme',
      client_name: 'Acme',
      client_email: null,
      deliverable_id: 'custom-software',
      status: 'draft',
      isolation_key: 'co-enhanced1',
      output_dir: null,
      test_status: 'pending',
      deploy_status: 'pending',
      metadata: { enhancedGreenfield: true },
      last_error: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    jest.spyOn(GreenfieldBuilderService.prototype, 'outputRoot').mockReturnValue(tmp);
    const builder = new GreenfieldBuilderService();
    const built = builder.build(row);
    expect(fs.existsSync(path.join(built.outputDir, '.env.example'))).toBe(true);
    expect(fs.existsSync(path.join(built.outputDir, 'README.md'))).toBe(true);
    const readme = fs.readFileSync(path.join(built.outputDir, 'README.md'), 'utf8');
    expect(readme).toMatch(/Deploy/i);
    expect(readme).toContain('.env.example');

    const tester = new ProductFactoryTestService();
    const result = tester.runTests({ ...row, output_dir: built.outputDir });
    expect(result.passed).toBe(true);
    expect(result.checks).toContain('node_test_ok');
  });
});
