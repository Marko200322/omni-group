import { ValidationError } from '../../../utils/errors';

export type ShopCatalogRow = {
  id: string;
  name: string;
  priceEur: number;
  stockQty: number;
  sku?: string;
  description?: string;
};

export type ShopSettings = {
  currency: string;
  taxRatePercent: number;
  shippingFlatEur: number;
  bankTransferEnabled: boolean;
};

export type PricedShopItem = {
  id: string;
  name: string;
  priceEur: number;
  quantity: number;
  stockQty?: number;
};

export type ShopOrderTotals = {
  subtotalEur: number;
  taxEur: number;
  shippingEur: number;
  taxRatePercent: number;
  totalEur: number;
  currency: string;
};

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  currency: 'EUR',
  taxRatePercent: 20,
  shippingFlatEur: 4.9,
  bankTransferEnabled: true,
};

export function roundEur(n: number): number {
  return Math.round(n * 100) / 100;
}

export function shopSettingsFromBranding(branding: unknown): ShopSettings {
  const raw =
    branding && typeof branding === 'object' && 'shopSettings' in branding
      ? (branding as { shopSettings?: unknown }).shopSettings
      : null;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SHOP_SETTINGS };
  const row = raw as Record<string, unknown>;
  const taxRatePercent =
    typeof row.taxRatePercent === 'number' && Number.isFinite(row.taxRatePercent)
      ? Math.max(0, Math.min(100, row.taxRatePercent))
      : DEFAULT_SHOP_SETTINGS.taxRatePercent;
  const shippingFlatEur =
    typeof row.shippingFlatEur === 'number' && Number.isFinite(row.shippingFlatEur)
      ? Math.max(0, row.shippingFlatEur)
      : DEFAULT_SHOP_SETTINGS.shippingFlatEur;
  const currency =
    typeof row.currency === 'string' && row.currency.trim()
      ? row.currency.trim().toUpperCase().slice(0, 8)
      : DEFAULT_SHOP_SETTINGS.currency;
  const bankTransferEnabled =
    typeof row.bankTransferEnabled === 'boolean'
      ? row.bankTransferEnabled
      : DEFAULT_SHOP_SETTINGS.bankTransferEnabled;
  return { currency, taxRatePercent, shippingFlatEur, bankTransferEnabled };
}

export function catalogRowsFromBranding(branding: unknown): ShopCatalogRow[] {
  const catalog =
    branding && typeof branding === 'object' && 'catalog' in branding
      ? (branding as { catalog?: unknown }).catalog
      : null;
  if (!Array.isArray(catalog)) return [];
  const rows: ShopCatalogRow[] = [];
  for (const raw of catalog) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    const priceEur = typeof row.priceEur === 'number' ? row.priceEur : Number(row.priceEur);
    const stockRaw = row.stockQty ?? row.stock ?? row.quantity;
    const stockQty =
      typeof stockRaw === 'number' && Number.isFinite(stockRaw)
        ? Math.max(0, Math.floor(stockRaw))
        : 25;
    if (!id || !Number.isFinite(priceEur) || priceEur < 0) continue;
    rows.push({
      id,
      name: name || id,
      priceEur,
      stockQty,
      sku: typeof row.sku === 'string' ? row.sku : undefined,
      description: typeof row.description === 'string' ? row.description : undefined,
    });
  }
  return rows;
}

export function priceShopItemsFromCatalog(
  branding: unknown,
  items: Array<{ id: string; quantity: number }>,
): PricedShopItem[] {
  const catalog = catalogRowsFromBranding(branding);
  if (!catalog.length) throw new ValidationError('This shop has no priced catalog');
  return items.map((item) => {
    const row = catalog.find((c) => c.id === item.id);
    if (!row) throw new ValidationError(`Unknown catalog item: ${item.id}`);
    if (item.quantity > row.stockQty) {
      throw new ValidationError(
        `Insufficient stock for ${row.name}: requested ${item.quantity}, available ${row.stockQty}`,
      );
    }
    return {
      id: row.id,
      name: row.name,
      priceEur: row.priceEur,
      quantity: item.quantity,
      stockQty: row.stockQty,
    };
  });
}

export function computeShopOrderTotals(
  pricedItems: PricedShopItem[],
  settings: ShopSettings,
): ShopOrderTotals {
  const subtotalEur = roundEur(
    pricedItems.reduce((sum, item) => sum + item.priceEur * item.quantity, 0),
  );
  if (subtotalEur <= 0) throw new ValidationError('Order total must be positive');
  const taxEur = roundEur(subtotalEur * (settings.taxRatePercent / 100));
  const shippingEur = roundEur(settings.shippingFlatEur);
  const totalEur = roundEur(subtotalEur + taxEur + shippingEur);
  return {
    subtotalEur,
    taxEur,
    shippingEur,
    taxRatePercent: settings.taxRatePercent,
    totalEur,
    currency: settings.currency,
  };
}

/** Decrement stockQty on matching catalog rows; returns updated branding object. */
export function decrementCatalogStock(
  branding: Record<string, unknown>,
  items: Array<{ id: string; quantity: number }>,
): Record<string, unknown> {
  const catalog = Array.isArray(branding.catalog) ? [...branding.catalog] : [];
  const nextCatalog = catalog.map((raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    const row = { ...(raw as Record<string, unknown>) };
    const id = typeof row.id === 'string' ? row.id : '';
    const ordered = items.find((i) => i.id === id);
    if (!ordered) return row;
    const stockRaw = row.stockQty ?? row.stock ?? 25;
    const stock =
      typeof stockRaw === 'number' && Number.isFinite(stockRaw) ? Math.floor(stockRaw) : 25;
    row.stockQty = Math.max(0, stock - ordered.quantity);
    return row;
  });
  return { ...branding, catalog: nextCatalog };
}

export function defaultEcommerceShopSettings(): ShopSettings {
  return { ...DEFAULT_SHOP_SETTINGS };
}
