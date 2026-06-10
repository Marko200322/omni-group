import axios, { AxiosRequestConfig } from 'axios';
import logger from '../utils/logger';
import { AggregatorCredentials, isAggregatorConfigured } from './types';

const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AggregatorHttpClient {
  constructor(
    private readonly creds: AggregatorCredentials,
    private readonly aggregatorName: string,
    private readonly maxAttempts = DEFAULT_MAX_ATTEMPTS,
    private readonly baseDelayMs = DEFAULT_BASE_DELAY_MS
  ) {}

  isConfigured(): boolean {
    return isAggregatorConfigured(this.creds);
  }

  protected getCredentials(): AggregatorCredentials {
    return this.creds;
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
    config?: Pick<AxiosRequestConfig, 'timeout'> & { maxAttempts?: number }
  ): Promise<T | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const url = this.resolveUrl(path);
    const timeout = config?.timeout ?? 30000;
    const maxAttempts = config?.maxAttempts ?? this.maxAttempts;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await axios.request<T>({
          method,
          url,
          data: body,
          headers: this.authHeaders(),
          timeout,
          validateStatus: (status) => status >= 200 && status < 300,
        });
        return response.data;
      } catch (err) {
        lastError = err;
        const status =
          axios.isAxiosError(err) && err.response?.status ? err.response.status : undefined;
        const noRetry = status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429;
        const message = err instanceof Error ? err.message : String(err);
        if (noRetry || attempt >= maxAttempts) {
          logger.warn(`${this.aggregatorName} aggregator request failed`, {
            path,
            attempts: attempt,
            status,
            message,
          });
          break;
        }
        const delayMs = this.baseDelayMs * 2 ** (attempt - 1);
        logger.debug(`${this.aggregatorName} aggregator retry`, { path, attempt, delayMs });
        await sleep(delayMs);
      }
    }

    if (lastError instanceof Error) {
      logger.warn(`${this.aggregatorName} aggregator exhausted`, { path, message: lastError.message });
    }
    return null;
  }
}
