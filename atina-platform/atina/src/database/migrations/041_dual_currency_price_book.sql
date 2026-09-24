-- Fixed EUR/USD SaaS price book and auditable reporting amounts.
BEGIN;

CREATE TABLE IF NOT EXISTS plan_prices (
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('EUR', 'USD')),
  billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  stripe_price_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (plan_id, currency, billing_cycle)
);

INSERT INTO plan_prices (plan_id, currency, billing_cycle, amount)
SELECT p.id, price.currency, price.billing_cycle, price.amount
FROM plans p
JOIN (
  VALUES
    ('starter', 'EUR', 'monthly', 79.00),
    ('starter', 'EUR', 'yearly', 790.00),
    ('starter', 'USD', 'monthly', 89.00),
    ('starter', 'USD', 'yearly', 890.00),
    ('pro', 'EUR', 'monthly', 249.00),
    ('pro', 'EUR', 'yearly', 2490.00),
    ('pro', 'USD', 'monthly', 279.00),
    ('pro', 'USD', 'yearly', 2790.00),
    ('enterprise', 'EUR', 'monthly', 429.00),
    ('enterprise', 'EUR', 'yearly', 4290.00),
    ('enterprise', 'USD', 'monthly', 469.00),
    ('enterprise', 'USD', 'yearly', 4690.00)
) AS price(plan_slug, currency, billing_cycle, amount)
  ON p.slug = price.plan_slug
ON CONFLICT (plan_id, currency, billing_cycle)
DO UPDATE SET amount = EXCLUDED.amount, is_active = true, updated_at = NOW();

-- Legacy columns remain the EUR compatibility view for existing consumers.
UPDATE plans SET
  name = CASE slug
    WHEN 'starter' THEN 'Launch'
    WHEN 'pro' THEN 'Growth'
    WHEN 'enterprise' THEN 'Scale'
    ELSE name
  END,
  price_monthly = CASE slug
    WHEN 'starter' THEN 79.00
    WHEN 'pro' THEN 249.00
    WHEN 'enterprise' THEN 429.00
    ELSE price_monthly
  END,
  price_yearly = CASE slug
    WHEN 'starter' THEN 790.00
    WHEN 'pro' THEN 2490.00
    WHEN 'enterprise' THEN 4290.00
    ELSE price_yearly
  END,
  currency = 'EUR',
  updated_at = NOW()
WHERE slug IN ('starter', 'pro', 'enterprise');

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS reporting_currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS reporting_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS fx_rate DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS fx_rate_at TIMESTAMPTZ;

UPDATE payments
SET reporting_amount = amount,
    fx_rate = 1,
    fx_rate_at = COALESCE(updated_at, created_at)
WHERE UPPER(currency) = 'EUR'
  AND reporting_amount IS NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS reporting_currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS reporting_total_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS fx_rate DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS fx_rate_at TIMESTAMPTZ;

UPDATE invoices
SET reporting_total_amount = total_amount,
    fx_rate = 1,
    fx_rate_at = COALESCE(updated_at, created_at)
WHERE UPPER(currency) = 'EUR'
  AND reporting_total_amount IS NULL;

COMMIT;

