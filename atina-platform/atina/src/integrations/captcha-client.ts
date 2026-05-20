import { config } from '../config';
import { AggregatorHttpClient } from './aggregator-http-client';

function captchaCreds(): { url: string; key: string } {
  return config?.aggregators?.captcha ?? { url: '', key: '' };
}

export class CaptchaClient extends AggregatorHttpClient {
  constructor(creds?: { url: string; key: string }) {
    super(creds ?? captchaCreds(), 'captcha');
  }

  solve(payload: { siteKey: string; pageUrl: string; provider?: string }): Promise<Record<string, unknown> | null> {
    return this.request('POST', '/v1/solve', payload);
  }
}

let defaultCaptchaClient: CaptchaClient | undefined;

export function getCaptchaClient(override?: CaptchaClient): CaptchaClient {
  if (override) return override;
  if (!defaultCaptchaClient) defaultCaptchaClient = new CaptchaClient();
  return defaultCaptchaClient;
}

export function resetCaptchaClientForTests(): void {
  defaultCaptchaClient = undefined;
}
