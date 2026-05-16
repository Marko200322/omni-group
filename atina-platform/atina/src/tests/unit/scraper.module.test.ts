import logger from '../../utils/logger';
import { ScraperModule } from '../../modules/scraper/scraper.module';

jest.mock('../../queue/queue', () => ({
  addJob: jest.fn(),
}));

jest.mock('../../database/connection');

describe('ScraperModule', () => {
  it('initialize registers routes and logs worker', async () => {
    const m = new ScraperModule();
    await m.initialize();
    expect(m.router).toBeDefined();
    expect(logger.info).toHaveBeenCalledWith('Scraper worker initialized');
  });

  it('initialize warns when worker init logging throws', async () => {
    jest.spyOn(logger, 'info').mockImplementationOnce(() => {
      throw new Error('log fail');
    });
    const m = new ScraperModule();
    await m.initialize();
    expect(logger.warn).toHaveBeenCalledWith(
      'Scraper worker init warning',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
