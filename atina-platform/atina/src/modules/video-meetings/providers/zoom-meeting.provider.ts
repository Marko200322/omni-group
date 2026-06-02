import axios from 'axios';
import { config } from '../../../config';

export type ZoomMeetingResult = {
  meetingUrl: string;
  externalMeetingId: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export function isZoomConfigured(): boolean {
  const z = config.videoMeetings.zoom;
  return Boolean(z.accountId.trim() && z.clientId.trim() && z.clientSecret.trim());
}

async function getZoomAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const { accountId, clientId, clientSecret } = config.videoMeetings.zoom;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await axios.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
    null,
    { headers: { Authorization: `Basic ${basic}` } }
  );

  const token = String(res.data.access_token ?? '');
  const expiresIn = Number(res.data.expires_in ?? 3600);
  if (!token) throw new Error('Zoom OAuth token missing');

  cachedToken = { value: token, expiresAt: now + expiresIn * 1000 };
  return token;
}

export async function createZoomMeeting(input: {
  topic: string;
  startTime: Date;
  durationMinutes: number;
  agenda?: string;
}): Promise<ZoomMeetingResult> {
  const token = await getZoomAccessToken();
  const res = await axios.post(
    'https://api.zoom.us/v2/users/me/meetings',
    {
      topic: input.topic,
      type: 2,
      start_time: input.startTime.toISOString(),
      duration: input.durationMinutes,
      timezone: 'Europe/Belgrade',
      agenda: input.agenda?.slice(0, 2000) ?? '',
      settings: {
        join_before_host: true,
        waiting_room: true,
      },
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );

  const joinUrl = String(res.data.join_url ?? '');
  const id = String(res.data.id ?? '');
  if (!joinUrl) throw new Error('Zoom meeting join_url missing');

  return { meetingUrl: joinUrl, externalMeetingId: id };
}

export function resetZoomTokenCacheForTests(): void {
  cachedToken = null;
}
