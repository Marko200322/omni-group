import { config } from '../config';
import { AggregatorHttpClient } from './aggregator-http-client';

function financeCreds(): { url: string; key: string } {
  return config?.aggregators?.finance ?? { url: '', key: '' };
}

export class FinanceClient extends AggregatorHttpClient {
  constructor(creds?: { url: string; key: string }) {
    super(creds ?? financeCreds(), 'finance');
  }

  healthCheck(): Promise<Record<string, unknown> | null> {
    return this.request<Record<string, unknown>>('GET', '/v1/health');
  }

  billingStatus(userId: string): Promise<Record<string, unknown> | null> {
    return this.request<Record<string, unknown>>('GET', `/v1/billing/status?userId=${encodeURIComponent(userId)}`);
  }

  createPayPalOrder(payload: Record<string, unknown>): Promise<{
    orderId?: string;
    approveUrl?: string;
  } | null> {
    return this.request('POST', '/v1/paypal/orders', payload);
  }

  capturePayPalOrder(orderId: string, payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    return this.request('POST', `/v1/paypal/orders/${encodeURIComponent(orderId)}/capture`, payload);
  }

  createWiseTransfer(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    return this.request('POST', '/v1/wise/transfers', payload);
  }

  confirmWiseTransfer(paymentId: string, payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    return this.request('POST', `/v1/wise/transfers/${encodeURIComponent(paymentId)}/confirm`, payload);
  }

  createKriptomanInvoice(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    return this.request('POST', '/v1/kriptoman/invoices', payload);
  }

  getKriptomanInvoice(invoiceId: string): Promise<Record<string, unknown> | null> {
    return this.request('GET', `/v1/kriptoman/invoices/${encodeURIComponent(invoiceId)}`);
  }
}

let defaultFinanceClient: FinanceClient | undefined;

export function getFinanceClient(override?: FinanceClient): FinanceClient {
  if (override) return override;
  if (!defaultFinanceClient) defaultFinanceClient = new FinanceClient();
  return defaultFinanceClient;
}

export function resetFinanceClientForTests(): void {
  defaultFinanceClient = undefined;
}
