import webpush from 'web-push';
import { config } from '../../../config';
import logger from '../../../utils/logger';
import { WebPushRepository } from '../repository/web-push.repository';

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export class WebPushService {
  private readonly repo = new WebPushRepository();
  private configured = false;

  constructor() {
    const { publicKey, privateKey, subject } = config.webPush;
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.configured = true;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getPublicKey(): string {
    return config.webPush.publicKey;
  }

  async upsertSubscription(
    userId: string,
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ): Promise<void> {
    await this.repo.upsert({
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent,
    });
  }

  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    await this.repo.deleteByEndpoint(userId, endpoint);
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    if (!this.configured) return 0;
    const subs = await this.repo.listByUser(userId);
    let sent = 0;
    for (const row of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await this.repo.deleteByEndpoint(userId, row.endpoint);
        }
        logger.warn('Web push delivery failed', {
          userId,
          endpoint: row.endpoint.slice(0, 48),
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return sent;
  }

  async notifyAdmins(payload: PushPayload): Promise<number> {
    const adminIds = await this.repo.listAdminUserIds();
    let total = 0;
    for (const id of adminIds) {
      total += await this.sendToUser(id, payload);
    }
    return total;
  }
}
