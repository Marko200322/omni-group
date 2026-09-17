import { adminOpsNotifier } from '../../modules/admin/service/admin-ops-notifier.service';

jest.mock('../../integrations/telegram-direct', () => ({
  sendTelegramDirect: jest.fn().mockResolvedValue(true),
}));

describe('AdminOpsNotifierService', () => {
  const orig = { ...process.env };

  beforeEach(() => {
    process.env.ADMIN_TELEGRAM_NOTIFY = 'true';
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_CHAT_ID = '12345';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...orig };
  });

  it('sends when telegram is configured', async () => {
    const { sendTelegramDirect } = await import('../../integrations/telegram-direct');
    expect(adminOpsNotifier.isConfigured()).toBe(true);
    const ok = await adminOpsNotifier.notify('payment_pending', ['Test line']);
    expect(ok).toBe(true);
    expect(sendTelegramDirect).toHaveBeenCalled();
  });

  it('skips when ADMIN_TELEGRAM_NOTIFY=false', async () => {
    process.env.ADMIN_TELEGRAM_NOTIFY = 'false';
    jest.resetModules();
    const { adminOpsNotifier: offNotifier } = await import(
      '../../modules/admin/service/admin-ops-notifier.service'
    );
    expect(offNotifier.isConfigured()).toBe(false);
  });
});
