import { priceItemsFromCatalog } from '../../modules/public-site/service/public-site.service';
import { ValidationError } from '../../utils/errors';

const branding = {
  catalog: [
    { id: 'sku-1', sku: 'HEA-1000', name: 'Starter package', priceEur: 49 },
    { id: 'sku-4', sku: 'HEA-1003', name: 'Premium service', priceEur: 199 },
  ],
};

describe('priceItemsFromCatalog', () => {
  it('uses catalog price and name instead of buyer-supplied values', () => {
    const items = priceItemsFromCatalog(branding, [
      { id: 'sku-4', name: 'Anything', priceEur: 0.01, quantity: 2 },
      { id: 'sku-1', name: 'Starter package', priceEur: 49, quantity: 1 },
    ]);
    expect(items).toEqual([
      { id: 'sku-4', name: 'Premium service', priceEur: 199, quantity: 2 },
      { id: 'sku-1', name: 'Starter package', priceEur: 49, quantity: 1 },
    ]);
  });

  it('rejects products that are not in the published catalog', () => {
    expect(() =>
      priceItemsFromCatalog(branding, [{ id: 'free-item', name: 'Free', priceEur: 0, quantity: 1 }]),
    ).toThrow(ValidationError);
  });

  it('rejects every item when the site has no catalog', () => {
    expect(() => priceItemsFromCatalog({}, [{ id: 'sku-1', name: 'x', priceEur: 49, quantity: 1 }])).toThrow(
      ValidationError,
    );
  });
});
