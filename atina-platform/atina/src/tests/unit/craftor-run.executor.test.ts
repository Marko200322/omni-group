import { config } from '../../config';
import { MODE_YIELDS } from '../../modules/craftor/service/craftor-mode-yields';
import { resolveCraftorYield } from '../../modules/craftor/service/craftor-run.executor';

const mockScraper = {
  isConfigured: jest.fn(),
  scrape: jest.fn(),
};

jest.mock('../../integrations', () => ({
  getScraperClient: () => mockScraper,
  getStorageClient: () => ({ isConfigured: () => false, uploadArtifact: jest.fn() }),
}));

jest.mock('../../modules/scraper/service/scraper-engine', () => ({
  scrapeWithAxios: jest.fn(),
}));

describe('resolveCraftorYield', () => {
  const craftorBackup = { ...config.craftor };

  beforeEach(() => {
    jest.clearAllMocks();
    config.craftor = { useRealScraper: false, deployPath: '' };
    mockScraper.isConfigured.mockReturnValue(false);
  });

  afterAll(() => {
    config.craftor = craftorBackup;
  });

  it('returns simulated hunting yields by default', async () => {
    const out = await resolveCraftorYield({
      systemId: 's1',
      v7Mode: 'hunting',
      niche: 'developer',
      platform: 'upwork',
    });
    expect(out.delivery_source).toBe('simulated');
    expect(out.leads).toBe(MODE_YIELDS.hunting.leads);
  });

  it('uses scraper delivery when aggregator is configured', async () => {
    mockScraper.isConfigured.mockReturnValue(true);
    mockScraper.scrape.mockResolvedValue({
      title: 'Jobs',
      links: ['a', 'b', 'c', 'd', 'e', 'f'],
    });

    const out = await resolveCraftorYield({
      systemId: 's2',
      v7Mode: 'hunting',
      niche: 'marketer',
      platform: 'upwork',
      input: { url: 'https://example.com/jobs' },
    });

    expect(out.delivery_source).toBe('scraper');
    expect(out.leads).toBe(6);
    expect(out.scrape_preview).toMatchObject({ links_found: 6 });
  });
});
