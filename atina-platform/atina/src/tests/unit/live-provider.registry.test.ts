import { parseLiveProviderChain, resolveLiveProvider, listLiveProviderStatus, hasRealLiveProvider } from '../../modules/live-call-avatar/providers/live-provider.registry';

jest.mock('../../config', () => ({
  config: {
    liveCallAvatar: {
      providerChain: 'heygen,d-id,stub',
      allowStub: true,
      heygenLiveApiKey: '',
      didAgentsApiKey: '',
    },
    videoMeetings: {
      avatarMedia: { heygenApiKey: '', didApiKey: '' },
    },
  },
}));

describe('live-provider.registry', () => {
  it('parseLiveProviderChain returns ordered unique ids', () => {
    expect(parseLiveProviderChain()).toEqual(['heygen', 'd-id', 'stub']);
  });

  it('resolveLiveProvider falls back to stub when keys missing', () => {
    const p = resolveLiveProvider('auto');
    expect(p.id).toBe('stub');
  });

  it('resolveLiveProvider honors explicit stub', () => {
    const p = resolveLiveProvider('stub');
    expect(p.id).toBe('stub');
    expect(p.isConfigured()).toBe(true);
  });

  it('listLiveProviderStatus includes all providers', () => {
    const list = listLiveProviderStatus();
    expect(list.map((x) => x.id)).toEqual(['heygen', 'd-id', 'stub']);
    expect(list.find((x) => x.id === 'stub')?.configured).toBe(true);
  });

  it('hasRealLiveProvider is false when only stub is configured', () => {
    expect(hasRealLiveProvider()).toBe(false);
  });
});
