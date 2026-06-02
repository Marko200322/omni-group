import { config } from '../../config';
import { PaymentNotificationsService } from '../../modules/payments/service/payment-notifications.service';

const sendEmail = jest.fn().mockResolvedValue(undefined);
const createNotification = jest.fn().mockResolvedValue({ id: 'n1' });

jest.mock('../../modules/notifications/service/notifications.service', () => ({
  NotificationsService: jest.fn().mockImplementation(() => ({
    sendEmail,
    createNotification,
  })),
}));

describe('PaymentNotificationsService', () => {
  let service: PaymentNotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentNotificationsService();
    (config as { paymentNotifyEmail: string }).paymentNotifyEmail = '';
    (config as { admin: { email: string } }).admin.email = 'owner@test.com';
  });

  it('sendManualCheckoutInstructions emails client with IBAN details', async () => {
    await service.sendManualCheckoutInstructions({
      toEmail: 'client@test.com',
      toName: 'Marko',
      planName: 'Pro',
      planSlug: 'pro',
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
      expect.stringContaining('Proforma faktura'),
      expect.stringContaining('RS123'),
      expect.stringContaining('ATINA-REF-1')
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
      expect.stringContaining('čekanju'),
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
      expect.stringContaining('Faktura INV-202605-0001'),
      expect.stringContaining('Plaćeno'),
      expect.stringContaining('Pro Plan (monthly)')
    );
  });
});
