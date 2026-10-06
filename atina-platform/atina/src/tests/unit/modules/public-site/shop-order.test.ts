import {
  catalogRowsFromBranding,
  computeShopOrderTotals,
  decrementCatalogStock,
  priceShopItemsFromCatalog,
  shopSettingsFromBranding,
  DEFAULT_SHOP_SETTINGS,
} from '../../../../modules/public-site/lib/shop-order';
import { ValidationError } from '../../../../utils/errors';

describe('shop-order helpers', () => {
  const branding = {
    catalog: [
      { id: 'sku-1', name: 'Everyday essentials set', priceEur: 42, stockQty: 10 },
      { id: 'sku-2', name: 'Signature product', priceEur: 68, stockQty: 2 },
    ],
    shopSettings: {
      currency: 'EUR',
      taxRatePercent: 20,
      shippingFlatEur: 4.9,
      bankTransferEnabled: true,
    },
  };

  it('reads shop settings with defaults', () => {
    expect(shopSettingsFromBranding({})).toEqual(DEFAULT_SHOP_SETTINGS);
    expect(shopSettingsFromBranding(branding).taxRatePercent).toBe(20);
    expect(shopSettingsFromBranding(branding).shippingFlatEur).toBe(4.9);
  });

  it('parses catalog with stock', () => {
    const rows = catalogRowsFromBranding(branding);
    expect(rows).toHaveLength(2);
    expect(rows[0].stockQty).toBe(10);
  });

  it('reprices from catalog and ignores client amounts', () => {
    const priced = priceShopItemsFromCatalog(branding, [
      { id: 'sku-1', quantity: 2 },
    ]);
    expect(priced).toEqual([
      { id: 'sku-1', name: 'Everyday essentials set', priceEur: 42, quantity: 2, stockQty: 10 },
    ]);
  });

  it('rejects unknown catalog ids', () => {
    expect(() => priceShopItemsFromCatalog(branding, [{ id: 'not-real', quantity: 1 }])).toThrow(
      ValidationError,
    );
  });

  it('rejects quantity above stock', () => {
    expect(() => priceShopItemsFromCatalog(branding, [{ id: 'sku-2', quantity: 5 }])).toThrow(
      /Insufficient stock/,
    );
  });

  it('computes tax and shipping totals', () => {
    const priced = priceShopItemsFromCatalog(branding, [{ id: 'sku-1', quantity: 2 }]);
    const totals = computeShopOrderTotals(priced, shopSettingsFromBranding(branding));
    expect(totals.subtotalEur).toBe(84);
    expect(totals.taxEur).toBe(16.8);
    expect(totals.shippingEur).toBe(4.9);
    expect(totals.totalEur).toBe(105.7);
  });

  it('decrements stock on catalog branding', () => {
    const next = decrementCatalogStock(branding, [{ id: 'sku-1', quantity: 3 }]);
    const rows = catalogRowsFromBranding(next);
    expect(rows.find((r) => r.id === 'sku-1')?.stockQty).toBe(7);
    expect(rows.find((r) => r.id === 'sku-2')?.stockQty).toBe(2);
  });
});
