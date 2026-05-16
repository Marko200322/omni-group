import { BillingModule } from '../../modules/billing/billing.module';

// eslint-disable-next-line no-var
var billingSvc: {
  getPlans: jest.Mock;
  getPlanBySlug: jest.Mock;
  getUserCurrentSubscription: jest.Mock;
  getUserInvoices: jest.Mock;
  getInvoiceById: jest.Mock;
  checkPlanLimit: jest.Mock;
};

jest.mock('../../modules/billing/service/billing.service', () => {
  billingSvc = {
    getPlans: jest.fn().mockResolvedValue([]),
    getPlanBySlug: jest.fn(),
    getUserCurrentSubscription: jest.fn(),
    getUserInvoices: jest.fn(),
    getInvoiceById: jest.fn(),
    checkPlanLimit: jest.fn(),
  };
  return {
    BillingService: jest.fn().mockImplementation(() => billingSvc),
  };
});

describe('BillingModule', () => {
  it('initialize registers billing routes', async () => {
    const m = new BillingModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
