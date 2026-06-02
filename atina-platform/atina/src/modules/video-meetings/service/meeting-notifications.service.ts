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

function formatDateSr(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('sr-RS', { dateStyle: 'short', timeStyle: 'short' });
}

function providerLabel(provider: string): string {
  if (provider === 'zoom') return 'Zoom';
  if (provider === 'google_meet') return 'Google Meet';
  return 'Ručno zakazivanje';
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
    const subject = `Nova support sesija — ${input.topic}`;
    const adminUrl = `${config.app.url.replace(/\/+$/, '')}/admin`;

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;color:#111">
        <h2>Novi zahtev za support poziv</h2>
        <p><strong>Klijent:</strong> ${escapeHtml(input.userName)} (${escapeHtml(input.userEmail)})</p>
        <p><strong>Tema:</strong> ${escapeHtml(input.topic)}</p>
        <p><strong>Agent (avatar):</strong> ${escapeHtml(input.agentName)}</p>
        <p><strong>Platforma:</strong> ${escapeHtml(providerLabel(input.provider))}</p>
        ${input.scheduledAt ? `<p><strong>Termin:</strong> ${escapeHtml(formatDateSr(input.scheduledAt))}</p>` : ''}
        ${input.description ? `<p><strong>Opis:</strong> ${escapeHtml(input.description)}</p>` : ''}
        <p><strong>Meeting ID:</strong> ${escapeHtml(input.meetingId)}</p>
        <p>Potvrdi i pošalji link: <code>POST /api/v1/video-meetings/support/confirm/${escapeHtml(input.meetingId)}</code></p>
        <p><a href="${escapeHtml(adminUrl)}">Admin panel</a></p>
      </div>
    `;

    const text = [
      'Nova support sesija',
      `Klijent: ${input.userName} <${input.userEmail}>`,
      `Tema: ${input.topic}`,
      `Provider: ${providerLabel(input.provider)}`,
      input.scheduledAt ? `Termin: ${formatDateSr(input.scheduledAt)}` : '',
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
    const kind = input.meetingType === 'support' ? 'Support' : 'Prodaja';
    const subject = `${kind} poziv zakazan — ${input.topic}`;

    const avatarBlock = input.agentAvatarUrl
      ? `<p><img src="${escapeHtml(input.agentAvatarUrl)}" alt="${escapeHtml(input.agentName)}" width="72" height="72" style="border-radius:50%;object-fit:cover" /></p>`
      : '';

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;color:#111">
        <h2>Tvoj ${kind.toLowerCase()} poziv je zakazan</h2>
        <p>Zdravo ${escapeHtml(input.toName || input.toEmail)},</p>
        ${avatarBlock}
        <p><strong>Agent:</strong> ${escapeHtml(input.agentName)}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 0;color:#555">Tema</td><td><strong>${escapeHtml(input.topic)}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#555">Platforma</td><td>${escapeHtml(providerLabel(input.provider))}</td></tr>
          <tr><td style="padding:6px 0;color:#555">Termin</td><td><strong>${escapeHtml(formatDateSr(input.scheduledAt))}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#555">Trajanje</td><td>${input.durationMinutes} min</td></tr>
        </table>
        <p><a href="${escapeHtml(input.meetingUrl)}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">Pridruži se pozivu</a></p>
        <p style="font-size:13px;color:#555">Link: ${escapeHtml(input.meetingUrl)}</p>
      </div>
    `;

    const text = [
      `${kind} poziv zakazan`,
      `Agent: ${input.agentName}`,
      `Tema: ${input.topic}`,
      `Termin: ${formatDateSr(input.scheduledAt)}`,
      `Platforma: ${providerLabel(input.provider)}`,
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
    const kind = input.meetingType === 'support' ? 'support' : 'prodajni';
    const subject = `Zahtev primljen — ${input.topic}`;

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;color:#111">
        <h2>Zahtev za ${kind} poziv je primljen</h2>
        <p>Zdravo ${escapeHtml(input.toName || input.toEmail)},</p>
        <p>Agent <strong>${escapeHtml(input.agentName)}</strong> će potvrditi termin i poslati ti link za ${escapeHtml(providerLabel(input.provider))}.</p>
        <p><strong>Tema:</strong> ${escapeHtml(input.topic)}</p>
      </div>
    `;

    await this.notifications.sendEmail(
      input.toEmail,
      subject,
      html,
      `Zahtev primljen za ${kind} poziv. Tema: ${input.topic}.`
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
