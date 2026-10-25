BEGIN;

-- Marketing subsystem for Monitoring UI slot + cron probes (layer=business: CHECK in 045).
INSERT INTO monitoring_services (code, name, layer, is_critical)
VALUES ('marketing', 'Marketing engine', 'business', FALSE)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      layer = EXCLUDED.layer,
      is_critical = EXCLUDED.is_critical,
      is_active = TRUE,
      updated_at = NOW();

COMMIT;
