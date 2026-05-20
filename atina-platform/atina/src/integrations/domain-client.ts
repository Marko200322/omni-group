import { config } from '../config';
import { AggregatorHttpClient } from './aggregator-http-client';

function domainCreds(): { url: string; key: string } {
  return config?.aggregators?.domain ?? { url: '', key: '' };
}

/** Njalla ili drugi domain registrar API. */
export class DomainClient extends AggregatorHttpClient {
  constructor(creds?: { url: string; key: string }) {
    super(creds ?? domainCreds(), 'domain');
  }

  registerDomain(payload: { domain: string; years?: number }): Promise<Record<string, unknown> | null> {
    return this.request('POST', '/v1/domains/register', payload);
  }
}

let defaultDomainClient: DomainClient | undefined;

export function getDomainClient(override?: DomainClient): DomainClient {
  if (override) return override;
  if (!defaultDomainClient) defaultDomainClient = new DomainClient();
  return defaultDomainClient;
}

export function resetDomainClientForTests(): void {
  defaultDomainClient = undefined;
}
