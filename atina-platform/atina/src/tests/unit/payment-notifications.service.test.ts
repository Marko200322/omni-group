import { config } from '../../config';
import {
  buildProformaNumber,
  PaymentNotificationsService,
} from '../../modules/payments/service/payment-notifications.service';

const sendEmail = jest.fn().mockResolvedValue(undefined);
const createNotification = jest.fn().mockResolvedValue({ id: 'n1' });

jest.mock('../../modules/notifications/service/notifications.service', () => ({
  NotificationsService: jest.fn().mockImplementation(() => ({
    sendEmail,
    createNotification,
  })),
}));

jest.mock('../../modules/admin/service/admin-ops-notifier.service', () => ({
  adminOpsNotifier: { notify: jest.fn().mockResolvedValue(true) },
}));

describe('PaymentNotificationsService', () => {
  let service: PaymentNotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentNotificationsService();
    (config as { paymentNotifyEmail: string }).paymentNotifyEmail = '';
    (config as { admin: { email: string } }).admin.email = 'owner@test.com';
    (config as { app: { name: string; url: string } }).app.name = 'Omni Group';
    (config as { app: { name: string; url: string } }).app.url = 'https://omnigroup.io';
  });

  it('sendManualCheckoutInstructions emails client with IBAN details', async () => {
    await service.sendManualCheckoutInstructions({
      toEmail: 'client@test.com',
      toName: 'Marko',
      planName: 'Pro',
      planSlug: 'pro',
      planDescription: 'Premium tier',
      billingCycle: 'monthly',
      amount: 49.99,
      currency: 'EUR',
      reference: 'ATINA-REF-1',
      paymentId: 'pay-1',
      instructions: {
        iban: 'RS123',
        accountName: 'Marko K',
        bankName: 'Banka',
        note: 'Ukljuci referencu',
      },
    });

    expect(sendEmail).toHaveBeenCalledWith(
      'client@test.com',
      expect.stringContaining('Proforma invoice'),
      expect.stringContaining('RS123'),
      expect.stringContaining('ATINA-REF-1'),
      expect.arrayContaining([
        expect.objectContaining({ filename: expect.stringMatching(/\.pdf$/i), content: expect.any(Buffer) }),
      ]),
    );
  });

  it('notifyAdminPaymentPending emails owner inbox', async () => {
    await service.notifyAdminPaymentPending({
      userEmail: 'client@test.com',
      userName: 'Marko',
      planName: 'Pro',
      billingCycle: 'monthly',
      amount: 49.99,
      currency: 'EUR',
      reference: 'ATINA-REF-1',
      paymentId: 'pay-1',
    });

    expect(sendEmail).toHaveBeenCalledWith(
      'owner@test.com',
      expect.stringContaining('pending'),
      expect.stringContaining('client@test.com'),
      expect.stringContaining('pay-1')
    );
  });

  it('sendInvoiceConfirmationToClient emails purchase receipt with line items', async () => {
    await service.sendInvoiceConfirmationToClient({
      toEmail: 'client@test.com',
      toName: 'Marko',
      invoiceNumber: 'INV-202605-0001',
      planName: 'Pro',
      planSlug: 'pro',
      planDescription: 'For growing teams',
      billingCycle: 'monthly',
      amount: 49.99,
      total: 49.99,
      currency: 'EUR',
      paymentId: 'pay-1',
      lineItems: [{ description: 'Pro Plan (monthly)', amount: 49.99, quantity: 1 }],
      periodStart: '2026-05-21T00:00:00.000Z',
      periodEnd: '2026-06-21T00:00:00.000Z',
      purchasedAt: '2026-05-21T12:00:00.000Z',
    });

    expect(sendEmail).toHaveBeenCalledWith(
      'client@test.com',
      expect.stringContaining('Invoice INV-202605-0001'),
      expect.stringContaining('Paid'),
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ filename: expect.stringMatching(/\.pdf$/i), content: expect.any(Buffer) }),
      ]),
    );
  });

  it('buildProformaNumber strips ATINA prefix and uses YYYYMM suffix', () => {
    expect(buildProformaNumber('ATINA-REF-12345678', new Date('2026-06-15T00:00:00.000Z'))).toBe(
      'PRO-202606-12345678',
    );
    expect(buildProformaNumber('XY', new Date('2026-01-02T00:00:00.000Z'))).toBe('PRO-202601-XY');
    expect(buildProformaNumber('ATINA-', new Date('2026-03-01T00:00:00.000Z'))).toBe('PRO-202603-ATINA-');
    expect(buildProformaNumber('ATINA-LIVE')).toMatch(/^PRO-\d{6}-/);
  });

  it('buildPurchaseConfirmedMessage formats purchase summary', () => {
    const message = service.buildPurchaseConfirmedMessage({
      planName: 'Pro',
      billingCycle: 'monthly',
      total: 49.99,
      currency: 'EUR',
      invoiceNumber: 'INV-202606-0001',
      periodEnd: '2026-07-01T00:00:00.000Z',
    });

    expect(message).toContain('Pro');
    expect(message).toContain('INV-202606-0001');
    expect(message).toContain('49.99');
  });

  it('createInAppPaymentNotification persists in-app alert', async () => {
    await service.createInAppPaymentNotification(
      'user-1',
      'payment_confirmed',
      'Payment confirmed',
      'Your plan is active.',
      { paymentId: 'pay-1' },
    );

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'payment_confirmed',
        channel: 'in_app',
        actionUrl: '/dashboard#billing',
        metadata: { paymentId: 'pay-1' },
      }),
    );
  });

  it('createInAppPaymentNotification swallows notification errors', async () => {
    createNotification.mockRejectedValueOnce(new Error('db down'));

    await expect(
      service.createInAppPaymentNotification('user-1', 'payment_pending', 'Pending', 'Awaiting transfer'),
    ).resolves.toBeUndefined();
  });

  it('createInAppPaymentNotification logs non-Error failures', async () => {
    createNotification.mockRejectedValueOnce('offline');

    await expect(
      service.createInAppPaymentNotification('user-1', 'payment_pending', 'Pending', 'Awaiting transfer'),
    ).resolves.toBeUndefined();
  });

  it('notifyAdminPaymentPending uses admin email when payment notify is blank', async () => {
    (config as { app: { name: string; url: string } }).app.name = '';
    (config as { app: { name: string; url: string } }).app.url = '';

    await service.notifyAdminPaymentPending({
      userEmail: 'client@test.com',
      userName: 'Marko',
      planName: 'Pro',
      billingCycle: 'monthly',
      amount: 49.99,
      currency: 'EUR',
      reference: 'ATINA-REF-1',
      paymentId: 'pay-1',
    });

    expect(sendEmail).toHaveBeenCalledWith(
      'owner@test.com',
      expect.any(String),
      expect.any(String),
      expect.any(String),
    );
  });

  it('notifyAdminPaymentPending prefers paymentNotifyEmail when configured', async () => {
    (config as { paymentNotifyEmail: string }).paymentNotifyEmail = 'billing@test.com';

    await service.notifyAdminPaymentPending({
      userEmail: 'client@test.com',
      userName: 'Marko',
      planName: 'Pro',
      billingCycle: 'monthly',
      amount: 49.99,
      currency: 'EUR',
      reference: 'ATINA-REF-1',
      paymentId: 'pay-2',
    });

    expect(sendEmail).toHaveBeenCalledWith(
      'billing@test.com',
      expect.any(String),
      expect.any(String),
      expect.any(String),
    );
  });

  it('sendDeliverableQaPendingToAdmin emails admin with optional public URL', async () => {
    (config as { app: { webUrl?: string; url: string } }).app.webUrl = 'https://app.test/';

    await service.sendDeliverableQaPendingToAdmin({
      toEmail: 'ops@test.com',
      clientName: 'Acme',
      deliverableName: 'Starter site',
      paymentId: 'pay-del-1',
      artifactCount: 3,
      publicUrl: 'sites/acme',
    });

    expect(sendEmail).toHaveBeenCalledWith(
      'ops@test.com',
      expect.stringContaining('QA pending'),
      expect.stringContaining('https://app.test/sites/acme'),
      expect.stringContaining('https://app.test/admin'),
    );
  });

  it('sendDeliverableQaPendingToAdmin omits site line when publicUrl is absent', async () => {
    await service.sendDeliverableQaPendingToAdmin({
      toEmail: 'ops@test.com',
      clientName: 'Acme',
      deliverableName: 'Starter site',
      paymentId: 'pay-del-2',
      artifactCount: 1,
    });

    const htmlBody = sendEmail.mock.calls[0][2] as string;
    expect(htmlBody).not.toContain('Site:');
  });

  it('sendDeliverableReadyToClient includes site, artifacts, and attachments', async () => {
    (config as { app: { webUrl?: string; url: string } }).app.webUrl = 'https://app.test';

    await service.sendDeliverableReadyToClient({
      toEmail: 'client@test.com',
      toName: 'Anna',
      deliverableName: 'Growth pack',
      deliverableId: 'del-1',
      publicUrl: '/sites/anna',
      paymentId: 'pay-del-3',
      artifactLabels: ['Brief', 'Wireframe'],
      attachments: [{ filename: 'brief.pdf', content: Buffer.from('pdf') }],
    });

    expect(sendEmail).toHaveBeenCalledWith(
      'client@test.com',
      expect.stringContaining('Delivered: Growth pack'),
      expect.stringContaining('https://app.test/sites/anna'),
      expect.stringContaining('Brief'),
      [{ filename: 'brief.pdf', content: expect.any(Buffer) }],
    );
  });

  it('sendDeliverableReadyToClient falls back when name and artifacts are missing', async () => {
    await service.sendDeliverableReadyToClient({
      toEmail: 'client@test.com',
      toName: '',
      deliverableName: 'Growth pack',
      deliverableId: 'del-2',
      paymentId: 'pay-del-4',
    });

    const textBody = sendEmail.mock.calls[0][3] as string;
    expect(textBody).toContain('Hi there,');
    expect(textBody).toContain('Check your dashboard for full delivery details.');
  });

  it('sendDeliverableQaPendingToAdmin uses app.url when webUrl is unset', async () => {
    delete (config as { app: { webUrl?: string; url: string } }).app.webUrl;
    (config as { app: { url: string } }).app.url = 'https://fallback.test/';

    await service.sendDeliverableQaPendingToAdmin({
      toEmail: 'ops@test.com',
      clientName: 'Acme',
      deliverableName: 'Starter site',
      paymentId: 'pay-del-5',
      artifactCount: 2,
      publicUrl: 'sites/acme',
    });

    expect(sendEmail).toHaveBeenCalledWith(
      'ops@test.com',
      expect.any(String),
      expect.stringContaining('https://fallback.test/sites/acme'),
      expect.any(String),
    );
  });
});
