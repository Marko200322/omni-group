import { config } from '../config';
import { AggregatorHttpClient } from './aggregator-http-client';

export type AiRememberPayload = {
  namespace: string;
  key: string;
  value: Record<string, unknown>;
  userId?: string;
};

export type AiRecommendationResult = {
  recommendations?: string[];
};

function aiCreds(): { url: string; key: string } {
  return config?.aggregators?.ai ?? { url: '', key: '' };
}

export class AiClient extends AggregatorHttpClient {
  constructor(creds?: { url: string; key: string }) {
    super(creds ?? aiCreds(), 'ai');
  }

  remember(payload: AiRememberPayload): Promise<unknown | null> {
    return this.request('POST', '/v1/memory/remember', payload);
  }

  recall(namespace: string, key?: string): Promise<unknown | null> {
    const query = key ? `?namespace=${encodeURIComponent(namespace)}&key=${encodeURIComponent(key)}` : `?namespace=${encodeURIComponent(namespace)}`;
    return this.request('GET', `/v1/memory/recall${query}`);
  }

  fetchRecommendations(context: Record<string, unknown>): Promise<AiRecommendationResult | null> {
    return this.request<AiRecommendationResult>('POST', '/v1/recommendations', { context });
  }
}

let defaultAiClient: AiClient | undefined;

export function getAiClient(override?: AiClient): AiClient {
  if (override) return override;
  if (!defaultAiClient) defaultAiClient = new AiClient();
  return defaultAiClient;
}

export function resetAiClientForTests(): void {
  defaultAiClient = undefined;
}
