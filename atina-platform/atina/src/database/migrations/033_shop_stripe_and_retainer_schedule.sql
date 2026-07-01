-- Shop Stripe checkout + retainer monthly run tracking

ALTER TABLE client_site_orders
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(32) NOT NULL DEFAULT 'manual'
    CHECK (payment_method IN ('manual', 'stripe')),
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_client_site_orders_stripe_session
  ON client_site_orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

COMMENT ON COLUMN client_site_orders.payment_method IS 'manual = bank transfer | stripe = card checkout';
