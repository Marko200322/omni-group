import { config } from '../config';
import { AggregatorHttpClient } from './aggregator-http-client';

export type IntegrationSyncPayload = {
  integrationId: string;
  providerSlug: string;
  userId: string;
};

function businessDevCreds(): { url: string; key: string } {
  return config?.aggregators?.businessDev ?? { url: '', key: '' };
}

export class BusinessDevClient extends AggregatorHttpClient {
  constructor(creds?: { url: string; key: string }) {
    super(creds ?? businessDevCreds(), 'businessDev');
  }

  syncIntegration(payload: IntegrationSyncPayload): Promise<Record<string, unknown> | null> {
    return this.request<Record<string, unknown>>('POST', '/v1/integrations/sync', payload);
  }

  listProviders(): Promise<unknown | null> {
    return this.request('GET', '/v1/integrations/providers');
  }
}

let defaultBusinessDevClient: BusinessDevClient | undefined;

export function getBusinessDevClient(override?: BusinessDevClient): BusinessDevClient {
  if (override) return override;
  if (!defaultBusinessDevClient) defaultBusinessDevClient = new BusinessDevClient();
  return defaultBusinessDevClient;
}

export function resetBusinessDevClientForTests(): void {
  defaultBusinessDevClient = undefined;
}
