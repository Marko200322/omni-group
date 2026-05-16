import axios, { AxiosRequestConfig } from 'axios';
import logger from '../utils/logger';
import { AggregatorCredentials, isAggregatorConfigured } from './types';

export class AggregatorHttpClient {
  constructor(
    private readonly creds: AggregatorCredentials,
    private readonly aggregatorName: string
  ) {}

  isConfigured(): boolean {
    return isAggregatorConfigured(this.creds);
  }

  private resolveUrl(path: string): string {
    const base = this.creds.url.trim().replace(/\/$/, '');
    return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.creds.key.trim()}`,
      'Content-Type': 'application/json',
    };
  }

  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    config?: Pick<AxiosRequestConfig, 'timeout'>
  ): Promise<T | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const url = this.resolveUrl(path);
    try {
      const response = await axios.request<T>({
        method,
        url,
        data: body,
        headers: this.authHeaders(),
        timeout: config?.timeout ?? 30000,
        validateStatus: (status) => status >= 200 && status < 300,
      });
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`${this.aggregatorName} aggregator request failed`, { path, message });
      return null;
    }
  }
}
