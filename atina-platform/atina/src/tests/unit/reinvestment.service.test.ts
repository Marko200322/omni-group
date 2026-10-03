import { AppError } from '../../utils/errors';
import { ReinvestmentService } from '../../modules/reinvestment/service/reinvestment.service';

// eslint-disable-next-line no-var
var repo: Record<string, jest.Mock>;

jest.mock('../../modules/reinvestment/repository/reinvestment.repository', () => {
  repo = {
    getActivePolicy: jest.fn(),
    listAccounts: jest.fn(),
    listBalances: jest.fn(),
    upsertDerivedBalance: jest.fn(),
    getAccountByCode: jest.fn(),
    getTransactionByIdempotencyKey: jest.fn(),
    insertTransactionIdempotent: jest.fn(),
    insertApproval: jest.fn(),
    appendAudit: jest.fn(),
    getRecentMonthlyAllocationTotals: jest.fn(),
    listOpportunities: jest.fn(),
    listDemandSignals: jest.fn(),
    upsertOpportunityFromSignal: jest.fn(),
    insertEngineRun: jest.fn(),
    insertForecast: jest.fn(),
    decideApproval: jest.fn(),
    getApprovalById: jest.fn(),
    updateTransactionStatus: jest.fn(),
    updateActivePolicy: jest.fn(),
    listPolicies: jest.fn(),
  };
  return {
    ReinvestmentRepository: jest.fn().mockImplementation(() => repo),
  };
});

jest.mock('../../modules/reinvestment/lib/observe', () => ({
  observeRevenueAllocations: jest.fn().mockResolvedValue({
    currency: 'EUR',
    paymentCount: 3,
    grossCents: 300_00,
    paymentFeeCents: 0,
    taxReserveCents: 30_00,
    resourceReserveCents: 20_00,
    systemReinvestCents: 100_00,
    ownerNetCents: 150_00,
    asOf: '2026-09-30T00:00:00.000Z',
    kind: 'ACTUAL',
  }),
}));

jest.mock('../../config', () => ({
  config: {
    reinvestment: {
      enabled: true,
      bankProvider: 'mock',
    },
    autonomy: { enabled: false },
    features: { scraper: false, crm: true, analytics: true, automation: true },
    productFactory: { enabled: false },
  },
}));

jest.mock('../../modules/reinvestment/lib/demand-intelligence', () => ({
  getDemandIntelligence: () => ({
    getTaxonomy: jest.fn().mockResolvedValue({
      concepts: [],
      capabilities: [],
      skuCapabilities: {},
      clusters: {},
      engineVersion: 'test',
    }),
    getCatalogBurden: jest.fn().mockResolvedValue([]),
    getDemandSnapshot: jest.fn().mockResolvedValue({
      commerce: {
        confirmedPaymentCount: 3,
        confirmedRevenueEur: 300,
        systemReinvestEur: 100,
        kind: 'ACTUAL',
      },
      note: 'test',
    }),
    classifyProblemText: jest.fn().mockResolvedValue({
      concepts: [],
      capabilities: [],
      topSkuIds: [],
    }),
  }),
}));

const activePolicyRow = {
  id: 'pol-1',
  version: 1,
  is_active: true,
  dry_run: true,
  kill_switch: false,
  autonomy_level: 0,
  operating_mode: 'normal',
  min_reserve_cents: '0',
  target_reserve_cents: '0',
  tax_reserve_bps: 0,
  system_allocation_bps: 0,
  marketing_allocation_bps: 0,
  profit_allocation_bps: 0,
  emergency_allocation_bps: 0,
  max_autonomous_spend_cents: '0',
  max_single_tx_cents: '50000',
  max_daily_spend_cents: '100000',
  max_weekly_spend_cents: '250000',
  max_monthly_spend_cents: '500000',
  max_project_budget_cents: '2500000',
  approval_threshold_cents: '50000',
  mandatory_approval_cents: '2500000',
  cooldown_seconds: 0,
  min_runway_months: '3',
  allow_marketing_reallocation: false,
  scoring_version: '1.0.0',
  policy_version: '1.0.0',
  engine_version: '1.0.0',
  config: {},
  created_by: null,
  created_at: '2026-09-30',
  updated_at: '2026-09-30',
};

const accounts = [
  { id: 'acc-rev', code: 'revenue', name: 'Revenue', currency: 'EUR', description: null, is_active: true },
  { id: 'acc-sys', code: 'system', name: 'System', currency: 'EUR', description: null, is_active: true },
  { id: 'acc-mkt', code: 'marketing', name: 'Marketing', currency: 'EUR', description: null, is_active: true },
  {
    id: 'acc-prf',
    code: 'profit_reserve',
    name: 'Profit',
    currency: 'EUR',
    description: null,
    is_active: true,
  },
];

describe('ReinvestmentService', () => {
  let service: ReinvestmentService;
  const actor = { userId: 'admin-1', role: 'admin' };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReinvestmentService();
    repo.getActivePolicy.mockResolvedValue({ rows: [activePolicyRow], rowCount: 1 });
    repo.listAccounts.mockResolvedValue({ rows: accounts, rowCount: accounts.length });
    repo.upsertDerivedBalance.mockResolvedValue({ rows: [{ id: 'b1' }], rowCount: 1 });
    repo.listBalances.mockResolvedValue({ rows: [], rowCount: 0 });
    repo.getRecentMonthlyAllocationTotals.mockResolvedValue({ rows: [], rowCount: 0 });
    repo.appendAudit.mockResolvedValue({ rows: [{ id: 'a1' }], rowCount: 1 });
    repo.getAccountByCode.mockImplementation(async (code: string) => {
      const row = accounts.find((a) => a.code === code);
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    });
    repo.getTransactionByIdempotencyKey.mockResolvedValue({ rows: [], rowCount: 0 });
    repo.insertApproval.mockResolvedValue({ rows: [{ id: 'ap1' }], rowCount: 1 });
  });

  it('proposeTransaction respects dry_run and returns simulated status', async () => {
    repo.insertTransactionIdempotent.mockResolvedValue({
      rows: [
        {
          id: 'tx-1',
          idempotency_key: 'ri:test:sim:1',
          status: 'simulated',
          dry_run: true,
          inserted: true,
        },
      ],
      rowCount: 1,
    });

    const result = await service.proposeTransaction(
      {
        idempotencyKey: 'ri:test:sim:1',
        sourceAccountCode: 'system',
        destinationAccountCode: 'marketing',
        amountCents: 1000,
        currency: 'EUR',
        purpose: 'reinvest',
      },
      actor
    );

    expect(result.dryRun).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.transaction.status).toBe('simulated');
    expect(repo.insertTransactionIdempotent).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: true,
        status: expect.stringMatching(/simulated|pending_approval|blocked/),
      })
    );
    // autonomy 0 → requires approval path may win; either simulated or pending_approval is ok under dry_run policy
    expect(['simulated', 'pending_approval']).toContain(
      repo.insertTransactionIdempotent.mock.calls[0][0].status
    );
  });

  it('proposeTransaction fails closed when kill_switch is active', async () => {
    repo.getActivePolicy.mockResolvedValue({
      rows: [{ ...activePolicyRow, kill_switch: true }],
      rowCount: 1,
    });

    await expect(
      service.proposeTransaction(
        {
          idempotencyKey: 'ri:test:kill:1',
          sourceAccountCode: 'system',
          destinationAccountCode: 'marketing',
          amountCents: 1000,
          currency: 'EUR',
          purpose: 'reinvest',
        },
        actor
      )
    ).rejects.toMatchObject({
      code: 'REINVESTMENT_KILL_SWITCH',
      statusCode: 403,
    });

    expect(repo.insertTransactionIdempotent).not.toHaveBeenCalled();
    expect(repo.appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'blocked', reason: 'kill_switch_active' })
    );
  });

  it('proposeTransaction returns existing row on duplicate idempotency_key', async () => {
    const existing = {
      id: 'tx-existing',
      idempotency_key: 'ri:test:dup:1',
      status: 'simulated',
      dry_run: true,
    };
    repo.getTransactionByIdempotencyKey.mockResolvedValue({ rows: [existing], rowCount: 1 });

    const result = await service.proposeTransaction(
      {
        idempotencyKey: 'ri:test:dup:1',
        sourceAccountCode: 'system',
        destinationAccountCode: 'marketing',
        amountCents: 1000,
        currency: 'EUR',
        purpose: 'reinvest',
      },
      actor
    );

    expect(result.duplicate).toBe(true);
    expect(result.transaction).toEqual(existing);
    expect(repo.insertTransactionIdempotent).not.toHaveBeenCalled();
  });

  it('proposeTransaction blocks marketing→system without allow flag', async () => {
    repo.insertTransactionIdempotent.mockResolvedValue({
      rows: [
        {
          id: 'tx-block',
          status: 'blocked',
          inserted: true,
        },
      ],
      rowCount: 1,
    });

    await expect(
      service.proposeTransaction(
        {
          idempotencyKey: 'ri:test:mkt:1',
          sourceAccountCode: 'marketing',
          destinationAccountCode: 'system',
          amountCents: 500,
          currency: 'EUR',
          purpose: 'reinvest',
        },
        actor
      )
    ).rejects.toBeInstanceOf(AppError);

    expect(repo.insertTransactionIdempotent).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'blocked' })
    );
  });

  it('getStatus derives balances from revenue observation without inventing money', async () => {
    const status = await service.getStatus(actor);
    expect(status.observation.grossCents).toBe(300_00);
    expect(status.observation.systemReinvestCents).toBe(100_00);
    expect(status.dryRun).toBe(true);
    expect(status.killSwitch).toBe(false);
    expect(repo.upsertDerivedBalance).toHaveBeenCalled();
  });
});
