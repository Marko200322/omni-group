import { Injectable, Logger } from '@nestjs/common';

/**
 * Email + Telegram alert sloj (stub) — blueprint modul 47/48.
 * Produkcija: zameni logger pozive stvarnim adapterima (SMTP, Bot API).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /** Stub metapodaci za `/notifications/health` (produkcija: SMTP / Bot). */
  health(): { ok: true; transport: 'logger-stub' } {
    return { ok: true, transport: 'logger-stub' };
  }

  sendInfo(message: string) {
    this.logger.log(`[notify:info] ${message}`);
  }

  sendWarn(message: string) {
    this.logger.warn(`[notify:warn] ${message}`);
  }

  sendError(message: string) {
    this.logger.error(`[notify:error] ${message}`);
  }
}
