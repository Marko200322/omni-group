import axios from 'axios';
import { config } from '../../config';
import { AggregatorHttpClient } from '../../integrations/aggregator-http-client';
import { AiClient, getAiClient, resetAiClientForTests } from '../../integrations/ai-client';
import { BusinessDevClient, getBusinessDevClient, resetBusinessDevClientForTests } from '../../integrations/business-dev-client';
import { CaptchaClient, getCaptchaClient, resetCaptchaClientForTests } from '../../integrations/captcha-client';
import { CommsClient, getCommsClient, resetCommsClientForTests } from '../../integrations/comms-client';
import { DomainClient, getDomainClient, resetDomainClientForTests } from '../../integrations/domain-client';
import { FinanceClient, getFinanceClient, resetFinanceClientForTests } from '../../integrations/finance-client';
import { InfrastructureClient, getInfrastructureClient, resetInfrastructureClientForTests } from '../../integrations/infrastructure-client';
import { ScraperClient, getScraperClient, resetScraperClientForTests } from '../../integrations/scraper-client';
import { StorageClient, getStorageClient, resetStorageClientForTests } from '../../integrations/storage-client';
import type { AggregatorCredentials } from '../../integrations/types';
import { isAggregatorConfigured } from '../../integrations/types';
import { Web3StorageClient, getWeb3StorageClient, resetWeb3StorageClientForTests } from '../../integrations/web3-storage-client';

jest.mock('axios');
const axiosRequest = axios.request as jest.MockedFunction<typeof axios.request>;
const axiosPost = axios.post as jest.MockedFunction<typeof axios.post>;
const axiosGet = axios.get as jest.MockedFunction<typeof axios.get>;

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
    resetCaptchaClientForTests();
    resetDomainClientForTests();
    resetWeb3StorageClientForTests();
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
      constructor(creds: AggregatorCredentials = configured, maxAttempts?: number, baseDelayMs?: number) {
        super(creds, 'test', maxAttempts, baseDelayMs);
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

    it('retries until success on transient errors', async () => {
      jest.useFakeTimers();
      axiosRequest
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce({ data: { ok: true } });
      const client = new TestClient({ url: 'https://agg.local', key: 'k' }, 4, 1);
      const pending = client.ping('/v1/health');
      await jest.runAllTimersAsync();
      await expect(pending).resolves.toEqual({ ok: true });
      expect(axiosRequest).toHaveBeenCalledTimes(3);
      jest.useRealTimers();
    });

    it('returns null when not configured', async () => {
      const client = new TestClient({ url: '', key: '' });
      await expect(client.ping('/v1/health')).resolves.toBeNull();
      expect(axiosRequest).not.toHaveBeenCalled();
    });

    it('returns null after exhausting retries', async () => {
      jest.useFakeTimers();
      axiosRequest.mockRejectedValue(new Error('down'));
      const client = new TestClient({ url: 'https://agg.local', key: 'k' }, 3, 5);
      const pending = client.ping('/v1/health');
      await jest.runAllTimersAsync();
      await expect(pending).resolves.toBeNull();
      jest.useRealTimers();
    });
  });

  describe('AiClient', () => {
    it('covers default constructor and recall', async () => {
      axiosRequest
        .mockResolvedValueOnce({ data: { items: [] } })
        .mockResolvedValueOnce({ data: { items: ['one'] } });
      const client = new AiClient(configured);
      await expect(client.recall('global', 'prefs')).resolves.toEqual({ items: [] });
      await expect(client.recall('global')).resolves.toEqual({ items: ['one'] });
    });

    it('remember posts payload', async () => {
      axiosRequest.mockResolvedValueOnce({ data: { stored: true } });
      const client = new AiClient(configured);
      await expect(client.remember({ namespace: 'n', key: 'k', value: {}, userId: 'u1' })).resolves.toEqual({
        stored: true,
      });
    });

    it('fetchRecommendations posts context', async () => {
      axiosRequest.mockResolvedValueOnce({ data: { recommendations: ['a'] } });
      const client = new AiClient(configured);
      await expect(client.fetchRecommendations({ userId: 'u1' })).resolves.toEqual({
        recommendations: ['a'],
      });
    });

    it('fetchRecommendations uses OpenRouter chat/completions when configured', async () => {
      config.aggregators.aiModel = 'openrouter/auto';
      axiosRequest.mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: '{"recommendations":["Vertical CRM","AI scheduling"]}' } }],
        },
      });
      const client = new AiClient({ url: 'https://openrouter.ai/api/v1', key: 'sk-test' });
      await expect(client.fetchRecommendations({ mode: 'market-research' })).resolves.toEqual({
        recommendations: ['Vertical CRM', 'AI scheduling'],
      });
      expect(axiosRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://openrouter.ai/api/v1/chat/completions' })
      );
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

    it('scrape uses Apify actor when SCRAPER_URL is Apify', async () => {
      axiosPost.mockResolvedValueOnce({
        data: [{ url: 'https://example.com', title: 'Example', links: ['https://a.com'] }],
      });
      const client = new ScraperClient({ url: 'https://api.apify.com', key: 'apify-token' });
      const result = await client.scrape({ url: 'https://example.com', extractLinks: true });
      expect(result).toEqual(
        expect.objectContaining({
          title: 'Example',
          delivery: 'apify',
          links: ['https://a.com'],
        })
      );
      expect(axiosPost).toHaveBeenCalledWith(
        expect.stringContaining('apify~cheerio-scraper'),
        expect.any(Object),
        expect.any(Object)
      );
      expect(axiosRequest).not.toHaveBeenCalled();
    });

    it('scrape falls back to axios GET when gateway is unavailable', async () => {
      axiosGet.mockResolvedValueOnce({
        status: 200,
        data: '<html><title>Direct</title><a href="https://link.test">x</a></html>',
      });
      const client = new ScraperClient({ url: 'https://example-scraper.io', key: 'k' });
      const result = await client.scrape({ url: 'https://example.com', extractLinks: true });
      expect(result).toEqual(
        expect.objectContaining({
          title: 'Direct',
          delivery: 'axios',
        })
      );
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

    it('paypal and wise endpoints', async () => {
      axiosRequest
        .mockResolvedValueOnce({ data: { orderId: 'ord_1', approveUrl: 'https://pay' } })
        .mockResolvedValueOnce({ data: { captureId: 'cap_1' } })
        .mockResolvedValueOnce({ data: { paymentId: 'wise_1' } })
        .mockResolvedValueOnce({ data: { status: 'confirmed' } });
      const client = new FinanceClient(configured);
      await expect(client.createPayPalOrder({ amount: 10 })).resolves.toEqual({
        orderId: 'ord_1',
        approveUrl: 'https://pay',
      });
      await expect(client.capturePayPalOrder('ord_1', { userId: 'u1' })).resolves.toEqual({
        captureId: 'cap_1',
      });
      await expect(client.createWiseTransfer({ reference: 'R1' })).resolves.toEqual({ paymentId: 'wise_1' });
      await expect(client.confirmWiseTransfer('wise_1', {})).resolves.toEqual({ status: 'confirmed' });
    });
  });

  describe('CaptchaClient', () => {
    it('solve posts payload', async () => {
      axiosRequest.mockResolvedValueOnce({ data: { token: 'ok' } });
      const client = new CaptchaClient(configured);
      await expect(client.solve({ siteKey: 'k', pageUrl: 'https://x' })).resolves.toEqual({ token: 'ok' });
      const singleton = getCaptchaClient();
      expect(getCaptchaClient()).toBe(singleton);
      expect(getCaptchaClient(client)).toBe(client);
      resetCaptchaClientForTests();
    });
  });

  describe('DomainClient', () => {
    it('registerDomain posts payload', async () => {
      axiosRequest.mockResolvedValueOnce({ data: { domain: 'x.io' } });
      const client = new DomainClient(configured);
      await expect(client.registerDomain({ domain: 'x.io' })).resolves.toEqual({ domain: 'x.io' });
      expect(getDomainClient()).toBe(getDomainClient());
      resetDomainClientForTests();
    });
  });

  describe('Web3StorageClient', () => {
    it('backup posts payload', async () => {
      axiosRequest.mockResolvedValueOnce({ data: { cid: 'bafy' } });
      const client = new Web3StorageClient(configured);
      await expect(client.backup({ path: 'vault.json' })).resolves.toEqual({ cid: 'bafy' });
      expect(getWeb3StorageClient()).toBe(getWeb3StorageClient());
      resetWeb3StorageClientForTests();
    });
  });

  describe('CommsClient', () => {
    it('sendEmail and sendNotification post payloads', async () => {
      axiosRequest
        .mockResolvedValueOnce({ data: { id: 'e1' } })
        .mockResolvedValueOnce({ data: { id: 'n1' } });
      const client = new CommsClient(configured);
      await expect(
        client.sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>x</p>' })
      ).resolves.toEqual({ id: 'e1' });
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
