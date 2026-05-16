import { config } from '../config';
import { AggregatorHttpClient } from './aggregator-http-client';

export type CommsNotificationPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  channel?: string;
  metadata?: Record<string, unknown>;
};

function commsCreds(): { url: string; key: string } {
  return config?.aggregators?.comms ?? { url: '', key: '' };
}

export class CommsClient extends AggregatorHttpClient {
  constructor(creds?: { url: string; key: string }) {
    super(creds ?? commsCreds(), 'comms');
  }

  sendEmail(payload: CommsNotificationPayload): Promise<unknown | null> {
    return this.request('POST', '/v1/notifications/email', payload);
  }

  sendNotification(payload: CommsNotificationPayload & { userId?: string }): Promise<unknown | null> {
    return this.request('POST', '/v1/notifications/send', payload);
  }
}

let defaultCommsClient: CommsClient | undefined;

export function getCommsClient(override?: CommsClient): CommsClient {
  if (override) return override;
  if (!defaultCommsClient) defaultCommsClient = new CommsClient();
  return defaultCommsClient;
}

export function resetCommsClientForTests(): void {
  defaultCommsClient = undefined;
}
