import nodemailer from 'nodemailer';
import { config } from '../../../config';
import { getCommsClient } from '../../../integrations';
import logger from '../../../utils/logger';
import type { NotificationsListQueryDtoType } from '../dto/notifications.dto';
import { NotificationsRepository } from '../repository/notifications.repository';

export class NotificationsService {
  private readonly repo = new NotificationsRepository();
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user
        ? { user: config.smtp.user, pass: config.smtp.password }
        : undefined,
    });
  }

  verifySmtpIfConfigured(): void {
    if (!this.isSmtpConfigured()) return;
    this.transporter
      .verify()
      .then(() => logger.info('SMTP connection verified'))
      .catch((err: Error) => logger.warn('SMTP not available', { error: err.message }));
  }

  isSmtpConfigured(): boolean {
    if (!config.smtp.enabled) return false;
    const smtpUser = (config.smtp.user || '').trim().toLowerCase();
    if (!smtpUser) return false;
    const placeholderMarkers = ['your_', 'example', 'change-me', 'placeholder'];
    return !placeholderMarkers.some((marker) => smtpUser.includes(marker));
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
    attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>,
  ): Promise<void> {
    const comms = getCommsClient();
    if (comms.isConfigured() && !attachments?.length) {
      const sent = await comms.sendEmail({ to, subject, html, text, channel: 'email' });
      if (sent) {
        logger.info('Email sent via comms aggregator', { to, subject });
        return;
      }
    }

    if (!attachments?.length && (await this.sendViaResend(to, subject, html, text))) {
      return;
    }

    if (!this.isSmtpConfigured()) {
      logger.warn('Email not sent — SMTP not configured', { to, subject });
      return;
    }
    await this.transporter.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.from}>`,
      to,
      subject,
      html,
      text: text || subject,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType ?? 'application/pdf',
      })),
    });
    logger.info('Email sent', { to, subject, attachments: attachments?.length ?? 0 });
  }

  private async sendViaResend(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<boolean> {
    const apiKey = config.resend.apiKey?.trim();
    const from = (config.resend.from || config.smtp.from || '').trim();
    if (!apiKey || !from) return false;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `"${config.smtp.fromName}" <${from}>`,
          to: [to],
          subject,
          html,
          text: text || subject,
        }),
      });

      if (!res.ok) {
        // Degrade to the next transport (SMTP) instead of hard-failing the caller.
        const detail = await res.text().catch(() => '');
        logger.warn('Resend delivery failed — falling back', {
          to,
          subject,
          status: res.status,
          detail: detail ? detail.slice(0, 200) : undefined,
        });
        return false;
      }
      logger.info('Email sent via Resend', { to, subject });
      return true;
    } catch (err) {
      logger.warn('Resend request error — falling back', {
        to,
        subject,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    channel?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }) {
    const channel = data.channel || 'in_app';
    const { rows } = await this.repo.insert({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      channel,
      actionUrl: data.actionUrl ?? null,
      metadata: data.metadata ?? {},
    });

    if (channel === 'email') {
      const { rows: userRows } = await this.repo.getUserEmail(data.userId);
      if (userRows[0]) {
        await this.sendEmail(
          userRows[0].email,
          data.title,
          `<p>${data.message}</p>${data.actionUrl ? `<p><a href="${data.actionUrl}">View</a></p>` : ''}`
        );
      }
    }
    return rows[0];
  }

  async list(userId: string, query: NotificationsListQueryDtoType) {
    const offset = (query.page - 1) * query.limit;
    const [countResult, listResult] = await this.repo.list(userId, {
      unreadOnly: query.unreadOnly === 'true',
      limit: query.limit,
      offset,
    });
    return {
      rows: listResult.rows,
      total: parseInt(countResult.rows[0]?.count ?? '0', 10),
      page: query.page,
      limit: query.limit,
    };
  }

  async markRead(id: string, userId: string) {
    await this.repo.markRead(id, userId);
  }

  async markAllRead(userId: string) {
    await this.repo.markAllRead(userId);
  }

  async delete(id: string, userId: string) {
    await this.repo.delete(id, userId);
  }

  async unreadCount(userId: string) {
    const { rows } = await this.repo.unreadCount(userId);
    return parseInt(rows[0]?.count ?? '0', 10);
  }
}
