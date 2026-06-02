import { config } from '../../config';
import { apexMediaProviderStatuses } from '../../modules/apex-predator/providers';

describe('apex media providers', () => {
  const apexBackup = { ...config.apex };

  afterAll(() => {
    config.apex = apexBackup;
  });

  it('reports not configured when env is empty', () => {
    config.apex.fluxUrl = '';
    config.apex.fluxKey = '';
    config.apex.livePortraitUrl = '';
    config.apex.livePortraitKey = '';

    const statuses = apexMediaProviderStatuses();
    expect(statuses).toHaveLength(2);
    expect(statuses.every((s) => !s.configured)).toBe(true);
    expect(statuses.map((s) => s.id)).toEqual(['flux', 'live_portrait']);
  });

  it('reports configured when both url and key are set', () => {
    config.apex.fluxUrl = 'https://flux.example';
    config.apex.fluxKey = 'secret';
    config.apex.livePortraitUrl = '';
    config.apex.livePortraitKey = '';

    const statuses = apexMediaProviderStatuses();
    const flux = statuses.find((s) => s.id === 'flux');
    expect(flux?.configured).toBe(true);
  });
});
