export type TwoFactorRecord = {
  enabled: boolean;
  secretEnc?: string;
  pendingSecretEnc?: string;
  backupHashes?: string[];
  confirmedAt?: string;
};

export function readTwoFactorRecord(metadata: unknown): TwoFactorRecord {
  let raw: unknown = metadata;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { enabled: false };
    }
  }
  if (!raw || typeof raw !== 'object') return { enabled: false };
  const tf = (raw as { twoFactor?: unknown }).twoFactor;
  if (!tf || typeof tf !== 'object') return { enabled: false };
  const row = tf as Record<string, unknown>;
  return {
    enabled: row.enabled === true,
    secretEnc: typeof row.secretEnc === 'string' ? row.secretEnc : undefined,
    pendingSecretEnc: typeof row.pendingSecretEnc === 'string' ? row.pendingSecretEnc : undefined,
    backupHashes: Array.isArray(row.backupHashes)
      ? row.backupHashes.filter((item): item is string => typeof item === 'string')
      : [],
    confirmedAt: typeof row.confirmedAt === 'string' ? row.confirmedAt : undefined,
  };
}
