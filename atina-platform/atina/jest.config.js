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
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Global thresholds track measured aggregate (collectCoverageFrom). Wave 1 (2026-04): aligned
  // with current suite (~97% stmts / ~91% branches) so test:ci is actionable; raise toward 100%
  // per module in later waves.
  // CI: npm run test:ci (lint + unit + coverage; skips integration/). GitHub: job integration
  // (needs unit job) runs Postgres + build + migrate + test:integration. Local: npm run db:up
  // then npm run test:integration:local.
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 97,
      statements: 97,
    },
  },
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup-env.ts'],
};
