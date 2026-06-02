import { config } from '../../../config';

export type GoogleMeetRoomResult = {
  meetingUrl: string;
  externalMeetingId: string;
};

export function isGoogleMeetConfigured(meetingType: 'support' | 'sales'): boolean {
  const url =
    meetingType === 'support'
      ? config.videoMeetings.googleMeet.supportRoomUrl
      : config.videoMeetings.googleMeet.salesRoomUrl;
  return Boolean(url.trim());
}

export function resolveGoogleMeetRoom(meetingType: 'support' | 'sales'): GoogleMeetRoomResult | null {
  const url =
    meetingType === 'support'
      ? config.videoMeetings.googleMeet.supportRoomUrl.trim()
      : config.videoMeetings.googleMeet.salesRoomUrl.trim();
  if (!url) return null;
  return {
    meetingUrl: url,
    externalMeetingId: `google_meet_room_${meetingType}`,
  };
}
