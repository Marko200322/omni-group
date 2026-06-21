import { listConfiguredTtsProviders } from '../../modules/video-meetings/providers/avatar-tts-render.provider';
import {
  avatarVideoCapable,
  listAvatarMediaStackStatus,
  listConfiguredVideoProviders,
} from '../../modules/video-meetings/providers/avatar-video-render.provider';

describe('avatar media provider chain', () => {
  it('exposes stack status shape', () => {
    const status = listAvatarMediaStackStatus();
    expect(status.ttsChain).toContain('elevenlabs');
    expect(status.videoChain).toContain('heygen');
    expect(Array.isArray(status.configured.tts)).toBe(true);
    expect(Array.isArray(status.configured.video)).toBe(true);
  });

  it('video capability requires image and configured provider', () => {
    expect(avatarVideoCapable('')).toBe(false);
    expect(avatarVideoCapable('http://localhost:3010/avatars/portraits/mila.svg')).toBe(
      listConfiguredVideoProviders().length > 0
    );
  });

  it('lists tts providers from chain', () => {
    const providers = listConfiguredTtsProviders();
    expect(providers.every((p) => p === 'elevenlabs' || p === 'cartesia')).toBe(true);
  });
});
