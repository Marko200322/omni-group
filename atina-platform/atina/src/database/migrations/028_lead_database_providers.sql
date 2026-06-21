BEGIN;

INSERT INTO resource_provider_wallets (provider_id, balance_eur, low_threshold_eur)
VALUES
  ('apollo', 0, 20),
  ('hunter', 0, 10),
  ('lusha', 0, 10),
  ('snov', 0, 10),
  ('zoominfo', 0, 25),
  ('neverbounce', 0, 5),
  ('zerobounce', 0, 5)
ON CONFLICT (provider_id) DO NOTHING;

COMMIT;
