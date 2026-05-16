import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let moduleRef: TestingModule;
  let controller: AnalyticsController;
  let analytics: jest.Mocked<Pick<AnalyticsService, 'overview'>>;

  beforeEach(async () => {
    analytics = { overview: jest.fn() };

    moduleRef = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: analytics }],
    }).compile();

    controller = moduleRef.get(AnalyticsController);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('GET dashboard/overview proxies to analytics.overview()', async () => {
    const payload = {
      users: 1,
      leads: 2,
      contracts: 3,
      invoices: 4,
      phase: 'v1',
      billingEnabled: false,
      aiEnabled: false,
      system: 'Atina System (Titan blueprint → Atina)',
    };
    analytics.overview.mockResolvedValue(payload);

    const result = await controller.overview();

    expect(analytics.overview).toHaveBeenCalled();
    expect(result).toBe(payload);
  });
});
