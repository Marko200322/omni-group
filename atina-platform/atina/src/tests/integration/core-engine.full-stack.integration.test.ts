/**
 * Full CoreEngine + Postgres: verifies every registered module is mounted and /health works.
 * Run: npm run test:integration:local (requires db:up + migrate).
 */
import request from 'supertest';
import { CoreEngine } from '../../core/CoreEngine';
import { moduleRegistry } from '../../core/ModuleRegistry';
import { closePool } from '../../database/connection';

const REQUIRED_SLUGS = [
  'auth',
  'users',
  'crm',
  'billing',
  'subscriptions',
  'payments',
  'tasks',
  'template-engine',
  'titan-score',
  'validator',
  'deal-offer',
  'follow-up',
  'follow-up-automation',
  'client-hunter',
  'lead-scoring',
  'proxy-rotation',
  'outreach',
  'contracts',
  'notifications',
  'admin',
  'titan-master',
  'dominus360',
  'craftor',
  'package-pricing',
  'digital-signature',
  'omnitube',
  'omnigame',
  'apex-predator',
  'titanis',
  'titanix',
  'atina-system',
  'sistem-naplate',
  'titan-monitor',
  'phase-launch',
  'resource-management',
  'kpi',
  'ai-memory',
  'recommendation',
  'backup-recovery',
  'integration-hub',
  'load-balancer',
  'compliance',
  'gdpr',
  'system-updater',
  'api-gateway',
  'audit-log',
  'self-healing',
  'workflow-chain',
  'forge',
  'analytics',
  'automation',
  'scraper',
] as const;

describe('CoreEngine full stack integration', () => {
  let engine: CoreEngine;

  beforeAll(async () => {
    moduleRegistry.resetForTests();
    engine = new CoreEngine();
    await engine.initialize();
  }, 120000);

  afterAll(async () => {
    await moduleRegistry.shutdownAll();
    moduleRegistry.resetForTests();
    await closePool();
  });

  it('GET /health returns ok', async () => {
    const res = await request(engine.getApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.environment).toBeDefined();
  });

  it('GET /api/v1 lists all required module slugs', async () => {
    const res = await request(engine.getApp()).get('/api/v1');
    expect(res.status).toBe(200);
    const slugs = new Set((res.body.modules as { slug: string }[]).map((m) => m.slug));
    for (const slug of REQUIRED_SLUGS) {
      expect(slugs.has(slug)).toBe(true);
    }
  });

  it('required module paths respond without 5xx', async () => {
    for (const slug of REQUIRED_SLUGS) {
      const r = await request(engine.getApp()).get(`/api/v1/${slug}`);
      expect(r.status).toBeLessThan(500);
    }
  });
});
