jest.mock('../../config', () => ({
  config: {
    app: {
      url: 'https://api.example.test',
      webUrl: 'https://app.example.test',
    },
    database: { host: 'localhost', port: 5432, name: 'test', user: 'u', password: 'p' },
    autonomy: { enabled: false },
    features: { scraper: false },
    smtp: { host: 'localhost', port: 1025, secure: false, user: '', pass: '', from: 'test@example.test' },
  },
}));

jest.mock('../../database/connection', () => ({
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
}));

jest.mock('../../modules/ai-memory/service/ai-memory.service', () => ({
  AiMemoryService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../modules/crm/service/crm.service', () => ({
  CrmService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../modules/tasks/service/tasks.service', () => ({
  TasksService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../modules/titanis/service/titanis.service', () => ({
  TitanisService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../modules/notifications/service/notifications.service', () => ({
  NotificationsService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../modules/auth/repository/auth.repository', () => ({
  AuthRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../modules/billing/service/deliverable-artifact-store.service', () => ({
  DeliverableArtifactStoreService: jest.fn().mockImplementation(() => ({
    saveText: jest.fn((input: { filename: string; type: string; downloadLabel?: string }) => ({
      type: input.type,
      filename: input.filename,
      storagePath: `/tmp/${input.filename}`,
      downloadLabel: input.downloadLabel ?? input.filename,
    })),
  })),
}));

import { ClientDeliverableBootstrapService } from '../../modules/billing/service/client-deliverable-bootstrap.service';
import type { VerticalDeliveryPack } from '../../modules/autonomy-loop/lib/vertical-delivery-resolver';

const stubPack = {
  verticalSlug: 'healthcare',
  category: 'healthcare',
  subtype: null,
  displayName: 'Healthcare',
  categoryProfile: {} as VerticalDeliveryPack['categoryProfile'],
  keywords: ['clinic'],
  valueProp: 'Ops clarity',
  outreachHooks: ['book demo'],
  researchFocus: ['HIPAA'],
  qualityGates: ['Staging E2E green'],
  coreModules: ['crm', 'billing'],
  workflowSteps: [],
  recommendedDeliverables: [],
  verticalPackageQuoteEur: 299,
  marketIntensityDefault: 1,
} as VerticalDeliveryPack;

describe('integration config usability', () => {
  const bootstrap = new ClientDeliverableBootstrapService();

  it('buildIntegrationConfig exposes env map, webhooks, retry policy, and onboarding checklist', () => {
    const config = bootstrap.buildIntegrationConfig({
      userId: 'user-1',
      clientName: 'Acme Dental',
      paymentId: 'pay-abc',
      pack: stubPack,
    });

    expect(config.status).toBe('DOCUMENTED_NOT_LIVE');
    expect(String(config.honestyNote)).toMatch(/NOT already connected/i);

    const envMap = config.envMap as Record<string, unknown>;
    expect(envMap.STRIPE_WEBHOOK_SECRET).toBeTruthy();
    expect(envMap.INTEGRATION_WEBHOOK_SECRET).toBeTruthy();

    const endpoints = config.webhookEndpoints as Record<string, string>;
    expect(endpoints.paymentCompleted).toContain('/payments/webhooks/stripe');
    expect(endpoints.deliverableReady).toContain('pay-abc');
    expect(endpoints.customIngress).toContain('user-1');
    expect(config.webhooks).toEqual(endpoints);

    const retry = config.retryPolicy as Record<string, unknown>;
    expect(retry.maxAttempts).toBe(5);
    expect(retry.backoffMultiplier).toBe(2);
    expect(retry.idempotencyHeader).toBe('Idempotency-Key');

    const checklist = config.onboardingChecklist as Array<Record<string, unknown>>;
    expect(checklist.length).toBeGreaterThanOrEqual(5);
    expect(checklist[0].title).toMatch(/webhookSecret/i);
    expect(checklist.some((s) => /envMap|NOT pre-connected|API key/i.test(String(s.action)))).toBe(
      true,
    );

    expect(Array.isArray(config.sampleEvents)).toBe(true);
    expect((config.sampleEvents as unknown[]).length).toBeGreaterThanOrEqual(3);
  });

  it('saveIntegrationOnboardingChecklist writes markdown artifact', () => {
    const config = bootstrap.buildIntegrationConfig({
      userId: 'user-1',
      clientName: 'Acme Dental',
      paymentId: 'pay-abc',
      pack: stubPack,
    });
    const artifact = bootstrap.saveIntegrationOnboardingChecklist({
      userId: 'user-1',
      paymentId: 'pay-abc',
      config,
    });
    expect(artifact.filename).toBe('integration-onboarding-checklist.md');
    expect(artifact.type).toBe('integration_onboarding_checklist');
  });
});
