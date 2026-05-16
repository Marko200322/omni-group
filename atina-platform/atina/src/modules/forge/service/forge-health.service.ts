import { TitanForgeService } from './titan-forge.service';

export type ForgeHealthDetails = {
  vaultPath: string | null;
  vaultSignal: 'available' | 'unavailable';
  lastForgeEventAgeMs: number | null;
  lastForgeEventFresh: boolean | null;
};

const LAST_EVENT_FRESHNESS_THRESHOLD_MS = 15 * 60 * 1000;

export async function getForgeHealthDetails(): Promise<ForgeHealthDetails> {
  const forge = new TitanForgeService();
  const vaultPath = forge.getVaultPath();

  try {
    const status = await forge.getStatus();
    const lastCreatedAt = status.recentEvents[0]?.createdAt;
    // Invalid or missing ISO timestamps are treated as "no age" (null), not as stale.
    const createdAtMs = lastCreatedAt ? Date.parse(lastCreatedAt) : NaN;
    const lastForgeEventAgeMs = Number.isFinite(createdAtMs)
      ? Math.max(0, Date.now() - createdAtMs)
      : null;

    return {
      vaultPath,
      vaultSignal: 'available',
      lastForgeEventAgeMs,
      lastForgeEventFresh: lastForgeEventAgeMs === null
        ? null
        : lastForgeEventAgeMs <= LAST_EVENT_FRESHNESS_THRESHOLD_MS,
    };
  } catch {
    return {
      vaultPath,
      vaultSignal: 'unavailable',
      lastForgeEventAgeMs: null,
      lastForgeEventFresh: null,
    };
  }
}
