jest.mock('../../../../database/connection');

const mockSendEmail = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../modules/notifications/service/notifications.service', () => ({
  NotificationsService: jest.fn().mockImplementation(() => ({
    sendEmail: mockSendEmail,
  })),
}));

import { OutboundQueueService } from '../../../../modules/autonomy-loop/service/outbound-queue.service';

jest.mock('../../../../config', () => ({
  config: {
    outreach: {
      sendEnabled: false,
      domainWarmupComplete: false,
      warmupMode: true,
      dailyCap: 20,
      fallbackNotifyEmail: 'ops@example.com',
      devSendToFallback: false,
      emailProvider: 'resend',
    },
    instantly: { apiKey: '', campaignId: '', baseUrl: 'https://api.instantly.ai' },
    autonomy: { enabled: false },
    features: { scraper: false },
    factoryPhase: 'M0',
    prodMode: 'lean',
  },
}));

jest.mock('../../../../modules/billing/lib/factory-phase-guard', () => ({
  assertFactoryModule: jest.fn(),
}));

const mockRepo = {
  countSentToday: jest.fn().mockResolvedValue({ rows: [{ count: '3' }] }),
  countByStatus: jest.fn().mockResolvedValue({
    rows: [
      { status: 'draft', count: '12' },
      { status: 'queued', count: '2' },
    ],
  }),
  listQueued: jest.fn().mockResolvedValue({ rows: [] }),
  listDrafts: jest.fn().mockResolvedValue({ rows: [] }),
  updateStatus: jest.fn().mockResolvedValue({ rows: [] }),
  recordTransientFailure: jest.fn().mockResolvedValue({ rows: [] }),
};

jest.mock('../../../../modules/autonomy-loop/repository/outbound-queue.repository', () => ({
  OutboundQueueRepository: jest.fn().mockImplementation(() => mockRepo),
}));

describe('outbound-queue.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo.countSentToday.mockResolvedValue({ rows: [{ count: '3' }] });
    mockRepo.countByStatus.mockResolvedValue({
      rows: [
        { status: 'draft', count: '12' },
        { status: 'queued', count: '2' },
      ],
    });
    mockRepo.listQueued.mockResolvedValue({ rows: [] });
    mockRepo.listDrafts.mockResolvedValue({ rows: [] });
    mockSendEmail.mockResolvedValue(undefined);
    const { config } = jest.requireMock('../../../../config') as {
      config: { outreach: { sendEnabled: boolean; domainWarmupComplete: boolean } };
    };
    config.outreach.sendEnabled = false;
    config.outreach.domainWarmupComplete = false;
  });

  it('returns stats with warmup gate and daily cap', async () => {
    const svc = new OutboundQueueService();
    const stats = await svc.getStats();
    expect(stats.warmupComplete).toBe(false);
    expect(stats.sentToday).toBe(3);
    expect(stats.remainingToday).toBe(17);
    expect(stats.byStatus.draft).toBe(12);
  });

  it('rejects process-send when OUTREACH_SEND_ENABLED is false', async () => {
    const svc = new OutboundQueueService();
    await expect(svc.processSendQueue()).rejects.toThrow(/OUTREACH_SEND_ENABLED=false/);
  });

  it('blocks send processing when warmup is incomplete but send is enabled', async () => {
    const { config } = jest.requireMock('../../../../config') as {
      config: { outreach: { sendEnabled: boolean } };
    };
    config.outreach.sendEnabled = true;
    const svc = new OutboundQueueService();
    const result = await svc.processSendQueue();
    expect(result).toEqual({ processed: 0, sent: 0, blocked: 0, failed: 0 });
  });

  it('requeues transient provider failures through the retry policy', async () => {
    const { config } = jest.requireMock('../../../../config') as {
      config: { outreach: { sendEnabled: boolean; domainWarmupComplete: boolean } };
    };
    config.outreach.sendEnabled = true;
    config.outreach.domainWarmupComplete = true;
    mockRepo.listQueued.mockResolvedValueOnce({
      rows: [{
        id: 'out-1',
        lead_email: 'buyer@acme-industries.com',
        lead_name: 'Buyer Name',
        lead_company: 'Company',
        subject: 'Subject',
        body_html: '<p>Body</p>',
        body_text: 'Body',
      }],
    });
    mockSendEmail.mockRejectedValueOnce(new Error('provider unavailable'));

    const result = await new OutboundQueueService().processSendQueue();

    expect(result).toMatchObject({ processed: 1, sent: 0, failed: 1 });
    expect(mockRepo.recordTransientFailure).toHaveBeenCalledWith(
      'out-1',
      'provider unavailable',
    );
    expect(mockRepo.updateStatus).not.toHaveBeenCalledWith(
      'out-1',
      'dead_letter',
      expect.anything(),
    );
  });
});
