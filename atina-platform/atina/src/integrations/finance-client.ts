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
