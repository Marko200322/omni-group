const mockConfig = { slack: { webhookUrl: '' } };

jest.mock('../../config', () => ({
  config: mockConfig,
}));

import { SlackNotifierService } from '../../utils/slack-notifier.service';

describe('SlackNotifierService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    mockConfig.slack.webhookUrl = '';
  });

  it('returns false when webhook is not configured', async () => {
    const svc = new SlackNotifierService();
    expect(svc.isConfigured()).toBe(false);
    expect(await svc.notify({ text: 'hello' })).toBe(false);
  });

  it('posts to webhook when configured', async () => {
    mockConfig.slack.webhookUrl = 'https://hooks.slack.com/services/test';
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as typeof fetch;
    const svc = new SlackNotifierService();
    expect(svc.isConfigured()).toBe(true);
    expect(await svc.notify({ text: 'fulfillment done' })).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://hooks.slack.com/services/test',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns false when webhook responds with error status', async () => {
    mockConfig.slack.webhookUrl = 'https://hooks.slack.com/services/test';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as typeof fetch;
    const svc = new SlackNotifierService();
    expect(await svc.notify({ text: 'fail' })).toBe(false);
  });

  it('returns false when webhook request throws', async () => {
    mockConfig.slack.webhookUrl = 'https://hooks.slack.com/services/test';
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as typeof fetch;
    const svc = new SlackNotifierService();
    expect(await svc.notify({ text: 'fail' })).toBe(false);
  });

  it('notifySupportDedicated and notifyFulfillmentComplete delegate to notify', async () => {
    mockConfig.slack.webhookUrl = 'https://hooks.slack.com/services/test';
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as typeof fetch;
    const svc = new SlackNotifierService();
    await svc.notifySupportDedicated({
      clientName: 'Acme',
      deliverableId: 'support-dedicated',
      slaHours: 4,
      modules: ['billing'],
    });
    await svc.notifyFulfillmentComplete({
      clientName: 'Acme',
      deliverableId: 'landing',
      artifactCount: 3,
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('getSlackNotifier', () => {
  it('returns singleton instance', async () => {
    const { getSlackNotifier } = await import('../../utils/slack-notifier.service');
    expect(getSlackNotifier()).toBe(getSlackNotifier());
  });
});
