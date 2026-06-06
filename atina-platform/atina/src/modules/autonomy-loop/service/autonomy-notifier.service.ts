import { config } from '../../../config';
import { getCommsClient } from '../../../integrations';
import { sendTelegramDirect } from '../../../integrations/telegram-direct';
import logger from '../../../utils/logger';
import { query } from '../../../database/connection';

export type AutonomyNotifyPayload = {
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'error';
  metadata?: Record<string, unknown>;
  userId?: string | null;
};

export class AutonomyNotifierService {
  async notify(payload: AutonomyNotifyPayload): Promise<{ telegram: boolean; alert: boolean }> {
    const text = `*${payload.title}*\n${payload.message}`.slice(0, 4000);
    const telegram = await this.sendTelegram(text);
    const alert = await this.createDashboardAlert(payload);
    if (!telegram && config.autonomy.telegram.notifyAutonomy) {
      logger.info('Autonomy notify (no Telegram)', { title: payload.title });
    }
    return { telegram, alert };
  }

  private async sendTelegram(text: string): Promise<boolean> {
    if (!config.autonomy.telegram.notifyAutonomy) return false;

    const chatId = config.autonomy.telegram.chatId;
    if (!chatId) return false;

    const comms = getCommsClient();
    if (comms.isConfigured()) {
      const res = await comms.sendTelegram({ chatId, text, parseMode: 'Markdown' });
      if (res) return true;
    }

    const token = config.autonomy.telegram.botToken;
    if (!token) return false;
    return sendTelegramDirect(token, chatId, text.replace(/\*/g, ''));
  }

  private async createDashboardAlert(payload: AutonomyNotifyPayload): Promise<boolean> {
    if (!payload.userId) return false;
    try {
      await query(
        `INSERT INTO system_alerts
           (user_id, severity, category, title, message, source_module, metadata)
         VALUES ($1, $2, 'autonomy', $3, $4, 'autonomy-loop', $5)`,
        [
          payload.userId,
          payload.severity ?? 'info',
          payload.title.slice(0, 255),
          payload.message,
          JSON.stringify(payload.metadata ?? {}),
        ]
      );
      return true;
    } catch (err) {
      logger.warn('Autonomy dashboard alert failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }
}
