import { RetainerSchedulerService } from '../../modules/billing/service/retainer-scheduler.service';

const listCompletedRetainers = jest.fn();
const patchResultMetadata = jest.fn();
const runLeadGenKickoff = jest.fn();

jest.mock('../../modules/billing/repository/deliverable-fulfillment.repository', () => ({
  DeliverableFulfillmentRepository: jest.fn().mockImplementation(() => ({
    listCompletedRetainers,
    patchResultMetadata,
  })),
}));

jest.mock('../../modules/billing/service/client-deliverable-bootstrap.service', () => ({
  ClientDeliverableBootstrapService: jest.fn().mockImplementation(() => ({
    runLeadGenKickoff,
  })),
}));

jest.mock('../../utils/slack-notifier.service', () => ({
  getSlackNotifier: () => ({ notify: jest.fn().mockResolvedValue(true) }),
}));

describe('RetainerSchedulerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listCompletedRetainers.mockResolvedValue([]);
    runLeadGenKickoff.mockResolvedValue({ leadsGenerated: 10, estimatedRevenue: 100 });
  });

  it('skips when last monthly run is recent', async () => {
    listCompletedRetainers.mockResolvedValue([
      {
        payment_id: 'pay-1',
        user_id: 'user-1',
        result: { metadata: { lastMonthlyLeadGenAt: new Date().toISOString() } },
      },
    ]);
    const svc = new RetainerSchedulerService();
    const out = await svc.tick();
    expect(out.processed).toBe(0);
    expect(runLeadGenKickoff).not.toHaveBeenCalled();
  });

  it('runs lead-gen when due', async () => {
    listCompletedRetainers.mockResolvedValue([
      {
        payment_id: 'pay-2',
        user_id: 'user-2',
        result: { metadata: { industryCategory: 'marketing' } },
      },
    ]);
    const svc = new RetainerSchedulerService();
    const out = await svc.tick();
    expect(out.processed).toBe(1);
    expect(runLeadGenKickoff).toHaveBeenCalledWith({
      userId: 'user-2',
      industryCategory: 'marketing',
    });
    expect(patchResultMetadata).toHaveBeenCalled();
  });
});
