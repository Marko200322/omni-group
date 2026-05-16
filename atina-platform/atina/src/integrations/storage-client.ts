import { config } from '../config';
import { AggregatorHttpClient } from './aggregator-http-client';

export type StorageBackupPayload = {
  snapshotId: string;
  snapshotType: string;
  metadata: Record<string, unknown>;
  userId?: string;
};

export type StorageUploadPayload = {
  path: string;
  contentBase64: string;
  contentType?: string;
  metadata?: Record<string, unknown>;
};

function storageCreds(): { url: string; key: string } {
  return config?.aggregators?.storage ?? { url: '', key: '' };
}

export class StorageClient extends AggregatorHttpClient {
  constructor(creds?: { url: string; key: string }) {
    super(creds ?? storageCreds(), 'storage');
  }

  createBackup(payload: StorageBackupPayload): Promise<Record<string, unknown> | null> {
    return this.request<Record<string, unknown>>('POST', '/v1/backup', payload);
  }

  uploadArtifact(payload: StorageUploadPayload): Promise<Record<string, unknown> | null> {
    return this.request<Record<string, unknown>>('POST', '/v1/upload', payload);
  }
}

let defaultStorageClient: StorageClient | undefined;

export function getStorageClient(override?: StorageClient): StorageClient {
  if (override) return override;
  if (!defaultStorageClient) defaultStorageClient = new StorageClient();
  return defaultStorageClient;
}

export function resetStorageClientForTests(): void {
  defaultStorageClient = undefined;
}
