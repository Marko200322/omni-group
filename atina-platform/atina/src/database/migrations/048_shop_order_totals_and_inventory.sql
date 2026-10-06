-- Shop order tax/shipping totals + structured totals JSON for client storefronts

ALTER TABLE client_site_orders
  ADD COLUMN IF NOT EXISTS subtotal_eur NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS tax_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS totals JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN client_site_orders.subtotal_eur IS 'Catalog line subtotal before tax/shipping';
COMMENT ON COLUMN client_site_orders.tax_eur IS 'Tax amount from shopSettings.taxRatePercent';
COMMENT ON COLUMN client_site_orders.shipping_eur IS 'Flat shipping from shopSettings.shippingFlatEur';
COMMENT ON COLUMN client_site_orders.totals IS 'Structured totals snapshot (subtotal, tax, shipping, currency)';

-- Backfill subtotal from total when missing (legacy orders had tax/shipping baked in or zero)
UPDATE client_site_orders
SET subtotal_eur = total_eur
WHERE subtotal_eur IS NULL;
