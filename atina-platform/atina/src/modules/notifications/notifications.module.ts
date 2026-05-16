import { Router } from 'express';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { query } from '../../database/connection';
import { sendSuccess, paginate } from '../../utils/response';
import { config } from '../../config';
import { getCommsClient } from '../../integrations';
import logger from '../../utils/logger';

const NotificationsListQueryDto = z
  .object({
    page: z.preprocess(
      (v) => (v === undefined || v === '' ? 1 : v),
      z.coerce.number().int().min(1)
    ),
    limit: z.preprocess(
      (v) => (v === undefined || v === '' ? 20 : v),
      z.coerce.number().int().min(1).max(100)
    ),
    unreadOnly: z.enum(['true', 'false']).optional(),
  })
  .strict();

const NotificationIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export class NotificationsModule implements IModule {
  name = 'Notifications';
  slug = 'notifications';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private transporter: nodemailer.Transporter;

  constructor() {
    this.router = Router();
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.password } : undefined,
    });
  }

  private isSmtpConfigured(): boolean {
    if (!config.smtp.enabled) { return false; }

    const smtpUser = (config.smtp.user || '').trim().toLowerCase();
    if (!smtpUser) { return false; }

    const placeholderMarkers = ['your_', 'example', 'change-me', 'placeholder'];
    return !placeholderMarkers.some((marker) => smtpUser.includes(marker));
  }

  async initialize(): Promise<void> {
    this.setupRoutes();
    // Verify SMTP if configured
    if (this.isSmtpConfigured()) {
      this.transporter.verify().then(() => {
        logger.info('SMTP connection verified');
      }).catch((err) => {
        logger.warn('SMTP not available', { error: err.message });
      });
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    const comms = getCommsClient();
    if (comms.isConfigured()) {
      const sent = await comms.sendEmail({ to, subject, html, text, channel: 'email' });
      if (sent) {
        logger.info('Email sent via comms aggregator', { to, subject });
        return;
      }
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
    });

    logger.info('Email sent', { to, subject });
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
    const { rows } = await query(
      `INSERT INTO notifications (user_id, type, title, message, channel, action_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.userId, data.type, data.title, data.message,
        data.channel || 'in_app', data.actionUrl || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    if (data.channel === 'email') {
      const { rows: userRows } = await query<{ email: string }>(
        'SELECT email FROM users WHERE id = $1', [data.userId]
      );
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

  private setupRoutes(): void {
    this.router.get(
      '/',
      authenticate,
      validateQuery(NotificationsListQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
      const { page, limit, unreadOnly } = req.query as unknown as z.infer<typeof NotificationsListQueryDto>;
      const offset = (page - 1) * limit;

      const conditions = ['user_id = $1'];
      const values: unknown[] = [req.user!.userId];
      if (unreadOnly === 'true') { conditions.push('is_read = false'); }

      const where = `WHERE ${conditions.join(' AND ')}`;
      const { rows: countRows } = await query<{ count: string }>(
        `SELECT COUNT(*) FROM notifications ${where}`, values
      );
      const { rows } = await query(
        `SELECT * FROM notifications ${where}
         ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );

      paginate(res, rows, parseInt(countRows[0].count, 10), page, limit);
      }
    );

    this.router.patch(
      '/:id/read',
      authenticate,
      validateParams(NotificationIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        await query(
          `UPDATE notifications SET is_read = true, read_at = NOW()
         WHERE id = $1 AND user_id = $2`,
          [req.params.id, req.user!.userId]
        );
        sendSuccess(res, null, 'Notification marked as read');
      }
    );

    this.router.patch('/read-all', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), async (req, res) => {
      await query(
        `UPDATE notifications SET is_read = true, read_at = NOW()
         WHERE user_id = $1 AND is_read = false`,
        [req.user!.userId]
      );
      sendSuccess(res, null, 'All notifications marked as read');
    });

    this.router.delete(
      '/:id',
      authenticate,
      validateParams(NotificationIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        await query(
          'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
          [req.params.id, req.user!.userId]
        );
        sendSuccess(res, null, 'Notification deleted');
      }
    );

    this.router.get(
      '/unread-count',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const { rows } = await query<{ count: string }>(
          'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
          [req.user!.userId]
        );
        sendSuccess(res, { count: parseInt(rows[0].count, 10) });
      }
    );
  }
}
