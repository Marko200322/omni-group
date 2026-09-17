import { config } from '../../../config';
import type { LiveAvatarProvider, LiveAvatarProviderId, LiveProviderStatus } from './live-provider.types';
import { HeygenLiveProvider, isHeygenLiveConfigured } from './heygen-live.provider';
import { DidAgentsLiveProvider, isDidAgentsLiveConfigured } from './did-agents-live.provider';
import { StubLiveProvider } from './stub-live.provider';

const providers: Record<LiveAvatarProviderId, LiveAvatarProvider> = {
  heygen: new HeygenLiveProvider(),
  'd-id': new DidAgentsLiveProvider(),
  stub: new StubLiveProvider(),
};

export function parseLiveProviderChain(): LiveAvatarProviderId[] {
  const raw = config.liveCallAvatar.providerChain;
  const allowed: LiveAvatarProviderId[] = ['heygen', 'd-id', 'stub'];
  const out: LiveAvatarProviderId[] = [];
  for (const part of raw.split(',')) {
    const id = part.trim().toLowerCase() as LiveAvatarProviderId;
    if (allowed.includes(id) && !out.includes(id)) out.push(id);
  }
  return out.length ? out : ['stub'];
}

export function resolveLiveProvider(preference?: string | null): LiveAvatarProvider {
  const pref = preference?.trim().toLowerCase();
  if (pref === 'heygen' || pref === 'd-id' || pref === 'stub') {
    const p = providers[pref];
    if (p.isConfigured() || pref === 'stub') return p;
  }
  if (pref === 'auto' || !pref) {
    for (const id of parseLiveProviderChain()) {
      const p = providers[id];
      if (id === 'stub' || p.isConfigured()) return p;
    }
  }
  return providers.stub;
}

export function listLiveProviderStatus(): LiveProviderStatus[] {
  return (['heygen', 'd-id', 'stub'] as LiveAvatarProviderId[]).map((id) => {
    const p = providers[id];
    const configured = p.isConfigured();
    return {
      id,
      configured: id === 'stub' ? true : configured,
      mode: id === 'stub' ? 'stub' : configured ? 'live' : 'stub',
      label:
        id === 'heygen'
          ? 'HeyGen Interactive Avatar'
          : id === 'd-id'
            ? 'D-ID Agents'
            : 'Stub (dev / fallback)',
    };
  });
}

export function hasRealLiveProvider(): boolean {
  return listLiveProviderStatus().some((p) => p.id !== 'stub' && p.configured);
}

export function getLiveProvider(id: LiveAvatarProviderId): LiveAvatarProvider {
  return providers[id];
}

export { isHeygenLiveConfigured, isDidAgentsLiveConfigured };
