import { ResourceProcurementService } from '../../modules/resource-procurement/service/resource-procurement.service';
import { catalogBySku, RESOURCE_CATALOG } from '../../modules/resource-procurement/catalog';

describe('resource procurement', () => {
  const service = new ResourceProcurementService();

  it('exposes catalog items', () => {
    expect(RESOURCE_CATALOG.length).toBeGreaterThanOrEqual(6);
    expect(catalogBySku('openrouter_10')?.providerId).toBe('openrouter');
  });

  it('resolves cart totals', () => {
    const { totalEur, items } = service.resolveCart([
      { sku: 'openrouter_10', qty: 2 },
      { sku: 'elevenlabs_10', qty: 1 },
    ]);
    expect(totalEur).toBe(30);
    expect(items).toHaveLength(2);
  });
});
