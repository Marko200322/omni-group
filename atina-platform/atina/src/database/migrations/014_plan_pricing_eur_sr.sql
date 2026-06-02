-- Regional pricing (EUR) + Serbian client-facing copy — aligned with omnigroup-web marketing.
UPDATE plans SET
  name = 'Poslovni',
  description = 'Za preduzetnike i solo timove — dashboard, osnovni CRM, email podrška.',
  price_monthly = 39.00,
  price_yearly = 390.00,
  currency = 'EUR',
  updated_at = NOW()
WHERE slug = 'starter';

UPDATE plans SET
  name = 'Rast',
  description = 'Za rastuće timove — automatizacije, CRM, scraper, AI avatar podrška.',
  price_monthly = 99.00,
  price_yearly = 990.00,
  currency = 'EUR',
  is_popular = true,
  updated_at = NOW()
WHERE slug = 'pro';

UPDATE plans SET
  name = 'Partner',
  description = 'Za partnere i veće organizacije — svi moduli, white-label, SLA.',
  price_monthly = 249.00,
  price_yearly = 2490.00,
  currency = 'EUR',
  updated_at = NOW()
WHERE slug = 'enterprise';
