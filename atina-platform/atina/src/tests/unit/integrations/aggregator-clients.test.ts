import axios from 'axios';
import {
  AiClient,
  BusinessDevClient,
  CommsClient,
  FinanceClient,
  InfrastructureClient,
  ScraperClient,
  StorageClient,
  AggregatorHttpClient,
  getAiClient,
  getBusinessDevClient,
  getCommsClient,
  getFinanceClient,
  getInfrastructureClient,
  getScraperClient,
  getStorageClient,
  resetAiClientForTests,
  resetBusinessDevClientForTests,
  resetCommsClientForTests,
  resetFinanceClientForTests,
  resetInfrastructureClientForTests,
  resetScraperClientForTests,
  resetStorageClientForTests,
} from '../../../integrations';
import { isAggregatorConfigured } from '../../../integrations/types';

jest.mock('axios');
const axiosRequest = axios.request as jest.MockedFunction<typeof axios.request>;

const configured = { url: 'https://agg.local', key: 'token' };

describe('aggregator integrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAiClientForTests();
    resetBusinessDevClientForTests();
    resetScraperClientForTests();
    resetFinanceClientForTests();
    resetCommsClientForTests();
    resetStorageClientForTests();
    resetInfrastructureClientForTests();
  });

  describe('isAggregatorConfigured', () => {
    it('returns false when url or key is empty', () => {
      expect(isAggregatorConfigured({ url: '', key: 'k' })).toBe(false);
      expect(isAggregatorConfigured({ url: 'https://x', key: '' })).toBe(false);
    });

    it('returns true when both are set', () => {
      expect(isAggregatorConfigured(configured)).toBe(true);
    });
  });

  describe('AggregatorHttpClient', () => {
    class TestClient extends AggregatorHttpClient {
      constructor(creds = configured) {
        super(creds, 'test');
      }

      ping(path: string) {
        return this.request<Record<string, unknown>>('GET', path);
      }

      postPing(body: unknown) {
        return this.request('POST', 'v1/ping', body);
      }
    }

    it('resolves relative paths without leading slash', async () => {
      axiosRequest.mockResolvedValueOnce({ data: { ok: true } });
      const client = new TestClient({ url: 'https://agg.local/', key: 'k' });
      await client.ping('v1/health');
      expect(axiosRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://agg.local/v1/health' })
      );
    });

    it('returns null and logs on non-Error failures', async () => {
      axiosRequest.mockRejectedValueOnce('network');
      const client = new TestClient();
      await expect(client.postPing({})).resolves.toBeNull();
    });
  });

  describe('AiClient', () => {
    it('covers default constructor and recall', async () => {
      axiosRequest.mockResolvedValueOnce({ data: { items: [] } });
      const client = new AiClient(configured);
      await expect(client.recall('global', 'prefs')).resolves.toEqual({ items: [] });
    });

    it('fetchRecommendations posts context', async () => {
      axiosRequest.mockResolvedValueOnce({ data: { recommendations: ['a'] } });
      const client = new AiClient(configured);
      await expect(client.fetchRecommendations({ userId: 'u1' })).resolves.toEqual({
        recommendations: ['a'],
      });
    });

    it('getAiClient singleton and reset', () => {
      const first = getAiClient();
      expect(getAiClient()).toBe(first);
      resetAiClientForTests();
      expect(getAiClient()).not.toBe(first);
    });
  });

  describe('BusinessDevClient', () => {
    it('listProviders and factory', async () => {
      axiosRequest.mockResolvedValueOnce({ data: ['github'] });
      const client = new BusinessDevClient(configured);
      await expect(client.listProviders()).resolves.toEqual(['github']);
      expect(getBusinessDevClient()).toBe(getBusinessDevClient());
      resetBusinessDevClientForTests();
    });
  });

  describe('ScraperClient', () => {
    it('fetchProxy uses default endpoint', async () => {
      axiosRequest.mockResolvedValueOnce({ data: { proxyId: 'px_001' } });
      const client = new ScraperClient(configured);
      await expect(client.fetchProxy()).resolves.toEqual({ proxyId: 'px_001' });
      expect(getScraperClient()).toBe(getScraperClient());
      resetScraperClientForTests();
    });
  });

  describe('FinanceClient', () => {
    it('healthCheck and billingStatus', async () => {
      axiosRequest
        .mockResolvedValueOnce({ data: { status: 'ok' } })
        .mockResolvedValueOnce({ data: { plan: 'pro' } });
      const client = new FinanceClient(configured);
      await expect(client.healthCheck()).resolves.toEqual({ status: 'ok' });
      await expect(client.billingStatus('u1')).resolves.toEqual({ plan: 'pro' });
      expect(getFinanceClient()).toBe(getFinanceClient());
      resetFinanceClientForTests();
    });
  });

  describe('CommsClient', () => {
    it('sendNotification posts payload', async () => {
      axiosRequest.mockResolvedValueOnce({ data: { id: 'n1' } });
      const client = new CommsClient(configured);
      await expect(
        client.sendNotification({ to: 'a@b.com', subject: 'Hi', html: '<p>x</p>', userId: 'u1' })
      ).resolves.toEqual({ id: 'n1' });
      expect(getCommsClient()).toBe(getCommsClient());
      resetCommsClientForTests();
    });
  });

  describe('StorageClient', () => {
    it('uploadArtifact posts base64 payload', async () => {
      axiosRequest.mockResolvedValueOnce({ data: { remoteId: 'up1' } });
      const client = new StorageClient(configured);
      await expect(
        client.uploadArtifact({ path: 'x.json', contentBase64: 'e30=', contentType: 'application/json' })
      ).resolves.toEqual({ remoteId: 'up1' });
      expect(getStorageClient()).toBe(getStorageClient());
      resetStorageClientForTests();
    });
  });

  describe('InfrastructureClient', () => {
    it('deployStatus reads remote state', async () => {
      axiosRequest.mockResolvedValueOnce({ data: { phase: 'v2' } });
      const client = new InfrastructureClient(configured);
      await expect(client.deployStatus()).resolves.toEqual({ phase: 'v2' });
      expect(getInfrastructureClient()).toBe(getInfrastructureClient());
      resetInfrastructureClientForTests();
    });
  });
});
