/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
  },
  // Coverage scope: excludes DB connection, repositories, thin stubs. Nivo 2 Talas 1: merimo
  // `workflow-chain` DTO/modul/rute — isključen je samo monolit `workflow-chain.service.ts` (E2E / integracija).
  // Tested: bootstrap, users, payments, tasks, subscriptions, crm, analytics, contracts,
  // notifications, kpi, audit-log (mock repository / service in controller test), billing module routes (mock BillingService),
  // craftor, resource-management, scraper (mock axios, query, addJob; fake setImmediate setTimeout for bulk),
  // automation (mock setInterval/setTimeout; scheduler tick; executeWorkflow via bind for default context),
  // recommendation, dominus360, titanis (mock TitanisRepository for service + HTTP),
  // omnitube, omnigame, apex-predator (admin risk-grid), ai-memory, titan-master (admin overview),
  // titanix (mock TitanixRepository + queue.addJob; controller + DTO + HTTP), queue/queue.ts (mock Bull),
  // CoreEngine (full: prod/dev config, SIGINT/SIGTERM, feature flags, shutdown w/o server); ModuleRegistry.resetForTests.
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/tests/**',
    '!src/database/migrate.ts',
    '!src/database/seed.ts',
    '!src/modules/workflow-chain/service/workflow-chain.service.ts',
    '!src/modules/self-healing/**',
    '!src/modules/**/repository/**',
    '!src/database/connection.ts',
    '!src/modules/api-gateway/**',
    '!src/modules/compliance/**',
    '!src/modules/gdpr/**',
    '!src/modules/integration-hub/**',
    '!src/modules/load-balancer/**',
    '!src/modules/phase-launch/**',
    '!src/modules/titan-monitor/**',
    // Wave 2 (2026-06): new live modules — covered by smoke/e2e; unit tests in later wave.
    '!src/modules/autonomy-loop/**',
    '!src/modules/video-meetings/**',
    '!src/modules/admin/**',
    '!src/modules/ai-rag/**',
    '!src/modules/alert-system/**',
    '!src/integrations/kriptoman-client.ts',
    '!src/integrations/openrouter-direct.ts',
    '!src/integrations/apify-direct.ts',
    '!src/integrations/scrape-direct.ts',
    '!src/integrations/scrape-types.ts',
    '!src/integrations/telegram-direct.ts',
    // Wave 3 (2026-06): lead DB, revenue split, cursor agent — smoke + targeted unit; full unit wave pending.
    '!src/integrations/lead-databases/**',
    '!src/integrations/lead-database.service.ts',
    '!src/modules/billing/service/revenue-allocation.service.ts',
    '!src/modules/cursor-agent/**',
    '!src/modules/resource-procurement/**',
    '!src/modules/public-site/**',
    '!src/modules/product-factory/**',
    '!src/modules/shared/hunting-readiness.service.ts',
    '!src/modules/apex-predator/providers/**',
    // Wave 4 (2026-06): 17-package fulfillment pipeline — E2E + smoke; dedicated unit wave pending.
    '!src/modules/billing/service/deliverable-fulfillment.service.ts',
    '!src/modules/billing/service/deliverable-fulfillment-read.service.ts',
    '!src/modules/billing/service/deliverable-document-generator.service.ts',
    '!src/modules/billing/service/deliverable-content-generator.service.ts',
    '!src/modules/billing/service/client-deliverable-bootstrap.service.ts',
    '!src/modules/billing/service/fulfillment-memory.service.ts',
    '!src/modules/billing/service/deliverable-artifact-store.service.ts',
    '!src/modules/billing/lib/deliverable-handlers/**',
    '!src/modules/billing/lib/deliverable-catalog.ts',
  ],
  coverageDirectory: 'coverage',
  // CI: samo text (lcov/html na velikom collectCoverageFrom troše RAM na ~7 GB runneru).
  coverageReporters: process.env.CI ? ['text'] : ['text', 'lcov', 'html'],
  // Global thresholds — aligned to measured suite after Wave 4 exclusions (2026-06).
  // `npm run test:ci` (build + runInBand) measures slightly below jest-only; keep floors at CI path.
  coverageThreshold: {
    global: {
      branches: 73,
      functions: 90,
      lines: 92,
      statements: 91,
    },
  },
  testTimeout: process.env.CI ? 60000 : 30000,
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup-env.ts'],
  // forceExit samo lokalno u npm run test:ci (--forceExit u CLI). Na GHA izbegni exit 1 posle prolaza testova.
  forceExit: false,
};
