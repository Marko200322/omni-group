import { config } from '../../../config';
import { NotificationsService } from '../../notifications/service/notifications.service';
import logger from '../../../utils/logger';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateEn(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
}

function providerLabel(provider: string): string {
  if (provider === 'zoom') return 'Zoom';
  if (provider === 'google_meet') return 'Google Meet';
  return 'Manual scheduling';
}

export class MeetingNotificationsService {
  private readonly notifications = new NotificationsService();

  private supportNotifyEmail(): string {
    return (
      config.videoMeetings.supportNotifyEmail.trim() ||
      config.paymentNotifyEmail.trim() ||
      config.admin.email
    );
  }

  async notifySupportTeamNewRequest(input: {
    userName: string;
    userEmail: string;
    topic: string;
    description?: string;
    provider: string;
    scheduledAt?: string | null;
    meetingId: string;
    agentName: string;
  }): Promise<void> {
    const subject = `New support session — ${input.topic}`;
    const adminUrl = `${config.app.url.replace(/\/+$/, '')}/admin`;

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;color:#111">
        <h2>New support call request</h2>
        <p><strong>Client:</strong> ${escapeHtml(input.userName)} (${escapeHtml(input.userEmail)})</p>
        <p><strong>Topic:</strong> ${escapeHtml(input.topic)}</p>
        <p><strong>Agent (avatar):</strong> ${escapeHtml(input.agentName)}</p>
        <p><strong>Platform:</strong> ${escapeHtml(providerLabel(input.provider))}</p>
        ${input.scheduledAt ? `<p><strong>Scheduled:</strong> ${escapeHtml(formatDateEn(input.scheduledAt))}</p>` : ''}
        ${input.description ? `<p><strong>Description:</strong> ${escapeHtml(input.description)}</p>` : ''}
        <p><strong>Meeting ID:</strong> ${escapeHtml(input.meetingId)}</p>
        <p>Confirm and send link: <code>POST /api/v1/video-meetings/support/confirm/${escapeHtml(input.meetingId)}</code></p>
        <p><a href="${escapeHtml(adminUrl)}">Admin panel</a></p>
      </div>
    `;

    const text = [
      'New support session',
      `Client: ${input.userName} <${input.userEmail}>`,
      `Topic: ${input.topic}`,
      `Provider: ${providerLabel(input.provider)}`,
      input.scheduledAt ? `Scheduled: ${formatDateEn(input.scheduledAt)}` : '',
      input.description ?? '',
      `Meeting ID: ${input.meetingId}`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.notifications.sendEmail(this.supportNotifyEmail(), subject, html, text);
  }

  async sendMeetingScheduledToClient(input: {
    toEmail: string;
    toName: string;
    meetingType: 'support' | 'sales';
    topic: string;
    agentName: string;
    agentAvatarUrl: string;
    provider: string;
    meetingUrl: string;
    scheduledAt: string;
    durationMinutes: number;
  }): Promise<void> {
    const kind = input.meetingType === 'support' ? 'Support' : 'Sales';
    const subject = `${kind} call scheduled — ${input.topic}`;

    const avatarBlock = input.agentAvatarUrl
      ? `<p><img src="${escapeHtml(input.agentAvatarUrl)}" alt="${escapeHtml(input.agentName)}" width="72" height="72" style="border-radius:50%;object-fit:cover" /></p>`
      : '';

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;color:#111">
        <h2>Your ${kind.toLowerCase()} call is scheduled</h2>
        <p>Hi ${escapeHtml(input.toName || input.toEmail)},</p>
        ${avatarBlock}
        <p><strong>Agent:</strong> ${escapeHtml(input.agentName)}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 0;color:#555">Topic</td><td><strong>${escapeHtml(input.topic)}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#555">Platform</td><td>${escapeHtml(providerLabel(input.provider))}</td></tr>
          <tr><td style="padding:6px 0;color:#555">Time</td><td><strong>${escapeHtml(formatDateEn(input.scheduledAt))}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#555">Duration</td><td>${input.durationMinutes} min</td></tr>
        </table>
        <p><a href="${escapeHtml(input.meetingUrl)}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">Join the call</a></p>
        <p style="font-size:13px;color:#555">Link: ${escapeHtml(input.meetingUrl)}</p>
      </div>
    `;

    const text = [
      `${kind} call scheduled`,
      `Agent: ${input.agentName}`,
      `Topic: ${input.topic}`,
      `Time: ${formatDateEn(input.scheduledAt)}`,
      `Platform: ${providerLabel(input.provider)}`,
      `Link: ${input.meetingUrl}`,
    ].join('\n');

    await this.notifications.sendEmail(input.toEmail, subject, html, text);
  }

  async sendMeetingPendingToClient(input: {
    toEmail: string;
    toName: string;
    meetingType: 'support' | 'sales';
    topic: string;
    agentName: string;
    provider: string;
  }): Promise<void> {
    const kind = input.meetingType === 'support' ? 'support' : 'sales';
    const subject = `Request received — ${input.topic}`;

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;color:#111">
        <h2>Your ${kind} call request was received</h2>
        <p>Hi ${escapeHtml(input.toName || input.toEmail)},</p>
        <p>Agent <strong>${escapeHtml(input.agentName)}</strong> will confirm the time and send you a link for ${escapeHtml(providerLabel(input.provider))}.</p>
        <p><strong>Topic:</strong> ${escapeHtml(input.topic)}</p>
      </div>
    `;

    await this.notifications.sendEmail(
      input.toEmail,
      subject,
      html,
      `Request received for ${kind} call. Topic: ${input.topic}.`
    );
  }

  dispatch(task: Promise<void>, label: string): void {
    void task.catch((err: unknown) => {
      logger.warn(`Meeting notification failed: ${label}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
}
