import { VideoMeetingsModule } from '../../modules/video-meetings/video-meetings.module';

describe('VideoMeetingsModule', () => {
  it('initialize registers routes', async () => {
    const m = new VideoMeetingsModule();
    await m.initialize();
    expect(m.router).toBeDefined();
    expect(m.slug).toBe('video-meetings');
  });
});
