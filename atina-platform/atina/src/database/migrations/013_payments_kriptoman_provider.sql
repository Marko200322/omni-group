-- Kriptoman crypto payments provider
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_provider_check;
ALTER TABLE payments ADD CONSTRAINT payments_provider_check
  CHECK (provider IN ('stripe', 'paypal', 'wise', 'manual', 'kriptoman'));
