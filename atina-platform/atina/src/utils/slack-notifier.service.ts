import { config } from '../config';
import logger from './logger';

export class SlackNotifierService {
  isConfigured(): boolean {
    return Boolean(config.slack.webhookUrl.trim());
  }

  async notify(payload: {
    text: string;
    blocks?: Array<Record<string, unknown>>;
  }): Promise<boolean> {
    const url = config.slack.webhookUrl.trim();
    if (!url) return false;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: payload.text,
          blocks: payload.blocks,
        }),
      });
      if (!res.ok) {
        logger.warn('Slack webhook failed', { status: res.status });
        return false;
      }
      return true;
    } catch (err) {
      logger.warn('Slack webhook error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  async notifySupportDedicated(input: {
    clientName: string;
    deliverableId: string;
    slaHours: number;
    modules: string[];
  }): Promise<void> {
    await this.notify({
      text: `Dedicated support live: ${input.clientName} (SLA ${input.slaHours}h)`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Dedicated support provisioned*\n• Client: ${input.clientName}\n• SLA: ${input.slaHours}h\n• Modules: ${input.modules.join(', ') || 'n/a'}`,
          },
        },
      ],
    });
  }

  async notifyFulfillmentComplete(input: {
    clientName: string;
    deliverableId: string;
    artifactCount: number;
  }): Promise<void> {
    await this.notify({
      text: `Fulfillment complete: ${input.deliverableId} for ${input.clientName}`,
    });
  }
}

let defaultSlack: SlackNotifierService | undefined;

export function getSlackNotifier(): SlackNotifierService {
  if (!defaultSlack) defaultSlack = new SlackNotifierService();
  return defaultSlack;
}
