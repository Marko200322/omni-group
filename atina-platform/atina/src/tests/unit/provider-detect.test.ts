import {
  isAggregatorGatewayProvider,
  isApifyProvider,
  isOpenRouterProvider,
  normalizeProviderUrl,
} from '../../integrations/provider-detect';

describe('provider-detect', () => {
  it('normalizes trailing slashes', () => {
    expect(normalizeProviderUrl('https://OpenRouter.AI/api/v1/')).toBe('https://openrouter.ai/api/v1');
  });

  it('detects OpenRouter', () => {
    expect(isOpenRouterProvider({ url: 'https://openrouter.ai/api/v1', key: 'k' })).toBe(true);
    expect(isOpenRouterProvider({ url: 'https://agg.local', key: 'k' })).toBe(false);
  });

  it('detects Apify', () => {
    expect(isApifyProvider({ url: 'https://api.apify.com', key: 'k' })).toBe(true);
  });

  it('detects custom aggregator gateway hosts', () => {
    expect(isAggregatorGatewayProvider({ url: 'https://atina-aggregator.internal', key: 'k' })).toBe(true);
    expect(isAggregatorGatewayProvider({ url: 'http://localhost:9090/v1', key: 'k' })).toBe(true);
    expect(isAggregatorGatewayProvider({ url: 'https://openrouter.ai/api/v1', key: 'k' })).toBe(false);
    expect(isAggregatorGatewayProvider({ url: 'https://api.apify.com', key: 'k' })).toBe(false);
  });
});
