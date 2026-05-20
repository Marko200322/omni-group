import { config } from '../config';
import { AggregatorHttpClient } from './aggregator-http-client';

function web3Creds(): { url: string; key: string } {
  return config?.aggregators?.web3Storage ?? { url: '', key: '' };
}

/** Storj / Web3 backup sloj (pored STORAGE R2/S3). */
export class Web3StorageClient extends AggregatorHttpClient {
  constructor(creds?: { url: string; key: string }) {
    super(creds ?? web3Creds(), 'web3Storage');
  }

  backup(payload: { path: string; encrypted?: boolean }): Promise<Record<string, unknown> | null> {
    return this.request('POST', '/v1/backup', payload);
  }
}

let defaultWeb3StorageClient: Web3StorageClient | undefined;

export function getWeb3StorageClient(override?: Web3StorageClient): Web3StorageClient {
  if (override) return override;
  if (!defaultWeb3StorageClient) defaultWeb3StorageClient = new Web3StorageClient();
  return defaultWeb3StorageClient;
}

export function resetWeb3StorageClientForTests(): void {
  defaultWeb3StorageClient = undefined;
}
