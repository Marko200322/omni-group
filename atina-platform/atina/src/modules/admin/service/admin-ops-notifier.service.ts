import { config } from '../../../config';
import { optionalBool } from '../../../config/env';
import { sendTelegramDirect } from '../../../integrations/telegram-direct';
import logger from '../../../utils/logger';

/** Admin events that may require owner action on prod. */
export type AdminOpsEvent =
  | 'payment_pending'
  | 'payment_confirmed'
  | 'fulfillment_failed'
  | 'fulfillment_qa'
  | 'contact_lead'
  | 'system_error';

const EVENT_LABEL: Record<AdminOpsEvent, string> = {
  payment_pending: '🔴 UPLATA — potvrdi u adminu',
  payment_confirmed: '🟢 Uplata potvrđena',
  fulfillment_failed: '🔴 FULFILLMENT FAIL — proveri admin',
  fulfillment_qa: '🟡 QA — pregled isporuke',
  contact_lead: '📩 Novi kontakt / lead',
  system_error: '🔴 Sistem greška',
};

export class AdminOpsNotifierService {
  isConfigured(): boolean {
    if (!optionalBool('ADMIN_TELEGRAM_NOTIFY', true)) return false;
    const token = config.autonomy.telegram.botToken.trim();
    const chatId = config.autonomy.telegram.chatId.trim();
    return Boolean(token && chatId);
  }

  async notify(event: AdminOpsEvent, lines: string[]): Promise<boolean> {
    if (!this.isConfigured()) return false;

    const header = EVENT_LABEL[event] ?? event;
    const site = (config.app.webUrl || config.app.url).replace(/\/+$/, '');
    const body = [header, ...lines, '', `Admin: ${site}/admin`].filter(Boolean).join('\n');

    const ok = await sendTelegramDirect(
      config.autonomy.telegram.botToken,
      config.autonomy.telegram.chatId,
      body.slice(0, 4000),
    );
    if (!ok) {
      logger.warn('Admin Telegram notify failed', { event });
    }
    return ok;
  }
}

export const adminOpsNotifier = new AdminOpsNotifierService();
