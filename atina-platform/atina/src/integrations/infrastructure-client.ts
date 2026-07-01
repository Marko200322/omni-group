import { config } from '../config';
import { AggregatorHttpClient } from './aggregator-http-client';

export type DeployTriggerPayload = {
  phase: string;
  notes?: string;
  actorUserId?: string;
  /** Skip execSync test runs — fulfillment must not block the API event loop. */
  skipBlockingSteps?: boolean;
};

function infrastructureCreds(): { url: string; key: string } {
  return config?.aggregators?.infrastructure ?? { url: '', key: '' };
}

export class InfrastructureClient extends AggregatorHttpClient {
  constructor(creds?: { url: string; key: string }) {
    super(creds ?? infrastructureCreds(), 'infrastructure');
  }

  deployStatus(): Promise<Record<string, unknown> | null> {
    return this.request<Record<string, unknown>>('GET', '/v1/deploy/status');
  }

  triggerDeploy(payload: DeployTriggerPayload): Promise<Record<string, unknown> | null> {
    return this.request<Record<string, unknown>>('POST', '/v1/deploy/trigger', payload);
  }
}

let defaultInfrastructureClient: InfrastructureClient | undefined;

export function getInfrastructureClient(override?: InfrastructureClient): InfrastructureClient {
  if (override) return override;
  if (!defaultInfrastructureClient) defaultInfrastructureClient = new InfrastructureClient();
  return defaultInfrastructureClient;
}

export function resetInfrastructureClientForTests(): void {
  defaultInfrastructureClient = undefined;
}
