import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config';
import { AggregatorHttpClient } from './aggregator-http-client';
import logger from '../utils/logger';

export type KriptomanInvoiceRequest = {
  externalId: string;
  amount: number;
  currency: string;
  cryptoCurrency?: string;
  description: string;
  callbackUrl: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, unknown>;
};

export type KriptomanInvoiceResult = {
  invoiceId: string;
  paymentUrl: string;
  payAddress?: string;
  cryptoAmount?: string;
  cryptoCurrency?: string;
  expiresAt?: string;
  status?: string;
};

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizeInvoiceResponse(raw: Record<string, unknown>): KriptomanInvoiceResult | null {
  const data =
    raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>)
      : raw;

  const invoiceId = pickString(data, ['id', 'invoice_id', 'invoiceId', 'payment_id', 'paymentId']);
  const paymentUrl = pickString(data, [
    'payment_url',
    'paymentUrl',
    'checkout_url',
    'checkoutUrl',
    'url',
    'redirect_url',
  ]);
  if (!invoiceId || !paymentUrl) return null;

  return {
    invoiceId,
    paymentUrl,
    payAddress: pickString(data, ['pay_address', 'payAddress', 'wallet_address', 'address']),
    cryptoAmount: pickString(data, ['crypto_amount', 'cryptoAmount', 'amount_crypto']),
    cryptoCurrency: pickString(data, ['crypto_currency', 'cryptoCurrency', 'currency_crypto']),
    expiresAt: pickString(data, ['expires_at', 'expiresAt', 'expiry']),
    status: pickString(data, ['status', 'state']),
  };
}

function normalizeStatus(raw: Record<string, unknown>): string {
  const data =
    raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>)
      : raw;
  return (
    pickString(data, ['status', 'state', 'payment_status']) ??
    pickString(raw, ['status', 'event', 'type']) ??
    ''
  ).toLowerCase();
}

export class KriptomanClient {
  private readonly finance = new AggregatorHttpClient(
    config.aggregators.finance,
    'finance-kriptoman'
  );

  isConfigured(): boolean {
    if (config.kriptoman.devMock) return true;
    const km = config.kriptoman;
    if (km.url.trim() && km.apiKey.trim()) return true;
    return this.finance.isConfigured();
  }

  private directHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${config.kriptoman.apiKey.trim()}`,
      'Content-Type': 'application/json',
      ...(config.kriptoman.merchantId
        ? { 'X-Merchant-Id': config.kriptoman.merchantId }
        : {}),
    };
  }

  private async directRequest<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<T | null> {
    const base = config.kriptoman.url.trim().replace(/\/$/, '');
    if (!base || !config.kriptoman.apiKey.trim()) return null;
    const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
    try {
      const res = await axios.request<T>({
        method,
        url,
        data: body,
        headers: this.directHeaders(),
        timeout: 30000,
        validateStatus: (s) => s >= 200 && s < 300,
      });
      return res.data;
    } catch (err) {
      logger.warn('Kriptoman API request failed', {
        path,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  async createInvoice(req: KriptomanInvoiceRequest): Promise<KriptomanInvoiceResult | null> {
    if (config.kriptoman.devMock) {
      return {
        invoiceId: `km_mock_${req.externalId}`,
        paymentUrl: `${config.app.url}/billing/kriptoman/mock?ref=${encodeURIComponent(req.externalId)}`,
        payAddress: 'TBc4MockWalletForDevOnly',
        cryptoAmount: String(req.amount),
        cryptoCurrency: req.cryptoCurrency ?? config.kriptoman.defaultCrypto,
        status: 'pending',
      };
    }

    const payload = {
      merchant_id: config.kriptoman.merchantId || undefined,
      external_id: req.externalId,
      amount: req.amount,
      currency: req.currency,
      crypto_currency: req.cryptoCurrency ?? config.kriptoman.defaultCrypto,
      description: req.description,
      callback_url: req.callbackUrl,
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      metadata: req.metadata,
    };

    const viaFinance = await this.finance.request<Record<string, unknown>>(
      'POST',
      '/v1/kriptoman/invoices',
      payload
    );
    if (viaFinance) return normalizeInvoiceResponse(viaFinance);

    const direct = await this.directRequest<Record<string, unknown>>(
      'POST',
      '/v1/invoices',
      payload
    );
    return direct ? normalizeInvoiceResponse(direct) : null;
  }

  async getInvoiceStatus(invoiceId: string): Promise<string | null> {
    if (config.kriptoman.devMock) return 'paid';

    const viaFinance = await this.finance.request<Record<string, unknown>>(
      'GET',
      `/v1/kriptoman/invoices/${encodeURIComponent(invoiceId)}`
    );
    if (viaFinance) return normalizeStatus(viaFinance);

    const direct = await this.directRequest<Record<string, unknown>>(
      'GET',
      `/v1/invoices/${encodeURIComponent(invoiceId)}`
    );
    return direct ? normalizeStatus(direct) : null;
  }

  verifyWebhookSignature(rawBody: Buffer | string, signatureHeader: string): boolean {
    const secret = config.kriptoman.webhookSecret.trim();
    if (!secret) return config.app.isDev;
    const raw = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const provided = signatureHeader.replace(/^sha256=/i, '').trim();
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(provided, 'hex')
      );
    } catch {
      return false;
    }
  }

  parseWebhookPayload(body: unknown): {
    invoiceId?: string;
    externalId?: string;
    status: string;
  } {
    const root =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
    const nested =
      root.data && typeof root.data === 'object' && !Array.isArray(root.data)
        ? (root.data as Record<string, unknown>)
        : root;

    return {
      invoiceId: pickString(nested, ['invoice_id', 'invoiceId', 'id', 'payment_id']),
      externalId: pickString(nested, ['external_id', 'externalId', 'order_id', 'reference']),
      status: normalizeStatus(root),
    };
  }

  isPaidStatus(status: string): boolean {
    const s = status.toLowerCase();
    return ['paid', 'completed', 'success', 'confirmed', 'payment.charge.complete'].some(
      (ok) => s === ok || s.includes(ok)
    );
  }
}

let defaultClient: KriptomanClient | undefined;

export function getKriptomanClient(override?: KriptomanClient): KriptomanClient {
  if (override) return override;
  if (!defaultClient) defaultClient = new KriptomanClient();
  return defaultClient;
}

export function resetKriptomanClientForTests(): void {
  defaultClient = undefined;
}
