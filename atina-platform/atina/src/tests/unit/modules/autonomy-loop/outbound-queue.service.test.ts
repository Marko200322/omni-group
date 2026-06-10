import { OutboundQueueService } from '../../../../modules/autonomy-loop/service/outbound-queue.service';

jest.mock('../../../../config', () => ({
  config: {
    outreach: {
      domainWarmupComplete: false,
      warmupMode: true,
      dailyCap: 20,
      fallbackNotifyEmail: 'ops@example.com',
    },
  },
}));

jest.mock('../../../../modules/autonomy-loop/repository/outbound-queue.repository', () => ({
  OutboundQueueRepository: jest.fn().mockImplementation(() => ({
    countSentToday: jest.fn().mockResolvedValue({ rows: [{ count: '3' }] }),
    countByStatus: jest.fn().mockResolvedValue({
      rows: [
        { status: 'draft', count: '12' },
        { status: 'queued', count: '2' },
      ],
    }),
    listQueued: jest.fn().mockResolvedValue({ rows: [] }),
  })),
}));

describe('outbound-queue.service', () => {
  it('returns stats with warmup gate and daily cap', async () => {
    const svc = new OutboundQueueService();
    const stats = await svc.getStats();
    expect(stats.warmupComplete).toBe(false);
    expect(stats.sentToday).toBe(3);
    expect(stats.remainingToday).toBe(17);
    expect(stats.byStatus.draft).toBe(12);
  });

  it('blocks send processing when warmup is incomplete', async () => {
    const svc = new OutboundQueueService();
    const result = await svc.processSendQueue();
    expect(result).toEqual({ processed: 0, sent: 0, blocked: 0, failed: 0 });
  });
});
