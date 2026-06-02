import axios from 'axios';
import { config } from '../../config';
import {
  executeOmnigameValidate,
  executeOmnitubePipeline,
  executeScrapeUrl,
  executeTitanixPipeline,
} from '../../modules/tasks/task-executors';

jest.mock('axios');
const mockAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;

const mockAi = {
  isConfigured: jest.fn(),
  fetchRecommendations: jest.fn(),
};
const mockScraper = {
  isConfigured: jest.fn(),
  scrape: jest.fn(),
};
const mockStorage = {
  isConfigured: jest.fn(),
  uploadArtifact: jest.fn(),
};

jest.mock('../../integrations', () => ({
  getAiClient: () => mockAi,
  getScraperClient: () => mockScraper,
  getStorageClient: () => mockStorage,
}));

describe('task-executors', () => {
  const pipelineUrlBackup = config.pipelines.youtubeWorkerUrl;
  const elevenBackup = config.pipelines.elevenLabsKey;

  beforeEach(() => {
    jest.clearAllMocks();
    config.pipelines.youtubeWorkerUrl = '';
    config.pipelines.elevenLabsKey = '';
    mockAi.isConfigured.mockReturnValue(false);
    mockScraper.isConfigured.mockReturnValue(false);
    mockStorage.isConfigured.mockReturnValue(false);
  });

  afterAll(() => {
    config.pipelines.youtubeWorkerUrl = pipelineUrlBackup;
    config.pipelines.elevenLabsKey = elevenBackup;
  });

  describe('executeOmnitubePipeline', () => {
    it('calls remote youtube pipeline when URL is set', async () => {
      config.pipelines.youtubeWorkerUrl = 'http://127.0.0.1:8090';
      mockAxiosPost.mockResolvedValueOnce({ data: { jobId: 'j1' } } as never);
      const out = await executeOmnitubePipeline({ systemId: 's1', mode: 'production' });
      expect(out).toMatchObject({ source: 'youtube_pipeline', remote: { jobId: 'j1' } });
      expect(mockAxiosPost).toHaveBeenCalledWith(
        'http://127.0.0.1:8090/run',
        { systemId: 's1', mode: 'production' },
        { timeout: 120000 }
      );
    });

    it('falls back to local path when remote pipeline fails', async () => {
      config.pipelines.youtubeWorkerUrl = 'http://127.0.0.1:8090/';
      mockAxiosPost.mockRejectedValueOnce(new Error('connection refused'));
      mockAi.isConfigured.mockReturnValue(true);
      mockAi.fetchRecommendations.mockResolvedValue({ recommendations: ['line1', 'line2'] });
      config.pipelines.elevenLabsKey = 'el-key';
      const out = await executeOmnitubePipeline({ systemId: 's2', mode: 'idea', topic: 'ai' });
      expect(out).toMatchObject({
        source: 'atina_node',
        script_generated: true,
        elevenlabs_configured: true,
      });
    });

    it('skips AI script when mode is not production/idea/publish', async () => {
      mockAi.isConfigured.mockReturnValue(true);
      const out = await executeOmnitubePipeline({ systemId: 's4', mode: 'optimize' });
      expect(out.script_generated).toBe(false);
      expect(mockAi.fetchRecommendations).not.toHaveBeenCalled();
    });

    it('uploads thumbnail when storage is configured', async () => {
      mockStorage.isConfigured.mockReturnValue(true);
      mockStorage.uploadArtifact.mockResolvedValue({ uri: 's3://thumb' });
      const out = await executeOmnitubePipeline({ systemId: 's3', mode: 'publish' });
      expect(out.thumbnail_uri).toBe('s3://thumb');
    });
  });

  describe('executeOmnigameValidate', () => {
    it('uses higher score when scraper returns data', async () => {
      mockScraper.isConfigured.mockReturnValue(true);
      mockScraper.scrape.mockResolvedValue({ links: ['a'] });
      const out = await executeOmnigameValidate({ genre: 'rpg' });
      expect(out).toMatchObject({
        genre: 'rpg',
        steam_trends_scraped: true,
        validation_score: 78,
        build_ready: true,
        steamworks: expect.objectContaining({ status: expect.any(String) }),
      });
    });

    it('uses fallback score without scraper', async () => {
      const out = await executeOmnigameValidate({});
      expect(out.validation_score).toBe(62);
      expect(out.steam_trends_scraped).toBe(false);
      expect(out.steamworks).toMatchObject({ status: 'n/a' });
    });

    it('treats STEAM_WEB_API_KEY as trend signal when scraper is off', async () => {
      const steamBackup = config.steam.webApiKey;
      config.steam.webApiKey = 'test-steam-key';
      const out = await executeOmnigameValidate({ genre: 'strategy' });
      config.steam.webApiKey = steamBackup;
      expect((out.steamworks as { status: string }).status).toBe('configured');
      expect(out.validation_score).toBe(78);
      expect(out.build_ready).toBe(true);
    });
  });

  describe('executeTitanixPipeline', () => {
    it('returns completed payload', async () => {
      const out = await executeTitanixPipeline({
        pipeline: 'p1',
        slot: 2,
        ecosystemSystemId: 'eco-1',
      });
      expect(out).toEqual({
        pipeline: 'p1',
        slot: 2,
        status: 'completed',
        ecosystemSystemId: 'eco-1',
      });
    });
  });

  describe('executeScrapeUrl', () => {
    it('scrapes via aggregator when configured', async () => {
      mockScraper.isConfigured.mockReturnValue(true);
      mockScraper.scrape.mockResolvedValue({ title: 'Page' });
      const out = await executeScrapeUrl({ url: 'https://example.com' });
      expect(out).toEqual({ url: 'https://example.com', status: 'scraped', data: { title: 'Page' } });
      expect(out).not.toHaveProperty('fallback');
    });

    it('returns fallback when scraper off or url empty', async () => {
      const out = await executeScrapeUrl({ url: '' });
      expect(out).toMatchObject({ status: 'scraped', fallback: true, data: {} });
    });
  });
});
