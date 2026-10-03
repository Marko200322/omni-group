BEGIN;

-- Omni Monitoring & Intelligence Engine (observability only — no financial authority)
-- Separate from reinvestment_* tables. Reuses system_alerts where possible for routing.

CREATE TABLE IF NOT EXISTS monitoring_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  layer VARCHAR(40) NOT NULL DEFAULT 'application'
    CHECK (layer IN (
      'infrastructure', 'database', 'api', 'payments', 'email',
      'omi', 'business', 'security', 'reinvestment', 'monitoring'
    )),
  is_critical BOOLEAN NOT NULL DEFAULT FALSE,
  check_interval_sec INT NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitoring_health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_code VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('healthy', 'warning', 'critical', 'unavailable', 'unknown')),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms INT,
  message TEXT,
  evidence JSONB NOT NULL DEFAULT '{}',
  engine_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  correlation_id VARCHAR(80)
);

CREATE INDEX IF NOT EXISTS idx_monitoring_health_service_checked
  ON monitoring_health_checks (service_code, checked_at DESC);

CREATE TABLE IF NOT EXISTS monitoring_metric_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_key VARCHAR(120) NOT NULL,
  service_code VARCHAR(80),
  value_num NUMERIC(24, 6) NOT NULL,
  unit VARCHAR(40) NOT NULL DEFAULT 'count',
  kind VARCHAR(20) NOT NULL DEFAULT 'actual'
    CHECK (kind IN ('actual', 'estimate', 'forecast', 'simulation')),
  labels JSONB NOT NULL DEFAULT '{}',
  sampled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_metric_key_sampled
  ON monitoring_metric_samples (metric_key, sampled_at DESC);

CREATE TABLE IF NOT EXISTS monitoring_baselines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_key VARCHAR(120) NOT NULL UNIQUE,
  window_hours INT NOT NULL DEFAULT 168,
  mean_value NUMERIC(24, 6) NOT NULL DEFAULT 0,
  stddev_value NUMERIC(24, 6) NOT NULL DEFAULT 0,
  p50 NUMERIC(24, 6),
  p95 NUMERIC(24, 6),
  sample_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS monitoring_thresholds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_key VARCHAR(120) NOT NULL UNIQUE,
  warn_above NUMERIC(24, 6),
  critical_above NUMERIC(24, 6),
  warn_below NUMERIC(24, 6),
  critical_below NUMERIC(24, 6),
  persistence_sec INT NOT NULL DEFAULT 60,
  cooldown_sec INT NOT NULL DEFAULT 300,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitoring_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_code VARCHAR(40) NOT NULL UNIQUE,
  title VARCHAR(240) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info', 'warning', 'high', 'critical')),
  status VARCHAR(40) NOT NULL DEFAULT 'detected'
    CHECK (status IN (
      'detected', 'acknowledged', 'investigating', 'mitigating',
      'monitoring', 'resolved', 'closed'
    )),
  affected_service VARCHAR(80),
  affected_functionality TEXT,
  symptoms TEXT,
  probable_cause TEXT,
  cause_confidence VARCHAR(20) DEFAULT 'inferred'
    CHECK (cause_confidence IN ('observed', 'inferred', 'confirmed')),
  evidence JSONB NOT NULL DEFAULT '[]',
  related_alert_ids JSONB NOT NULL DEFAULT '[]',
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution TEXT,
  post_incident_notes TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  engine_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_incidents_status_sev
  ON monitoring_incidents (status, severity, detected_at DESC);

CREATE TABLE IF NOT EXISTS monitoring_incident_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES monitoring_incidents(id) ON DELETE CASCADE,
  event_type VARCHAR(60) NOT NULL,
  message TEXT NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitoring_anomaly_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_key VARCHAR(120) NOT NULL,
  service_code VARCHAR(80),
  severity VARCHAR(20) NOT NULL DEFAULT 'warning',
  detector VARCHAR(40) NOT NULL DEFAULT 'threshold'
    CHECK (detector IN ('threshold', 'baseline', 'trend', 'correlation')),
  observed_value NUMERIC(24, 6),
  baseline_value NUMERIC(24, 6),
  score NUMERIC(10, 4),
  message TEXT NOT NULL,
  incident_id UUID REFERENCES monitoring_incidents(id) ON DELETE SET NULL,
  dedupe_key VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_anomaly_dedupe
  ON monitoring_anomaly_events (dedupe_key, created_at DESC);

CREATE TABLE IF NOT EXISTS monitoring_engine_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase VARCHAR(40) NOT NULL DEFAULT 'probe',
  status VARCHAR(40) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('started', 'completed', 'failed', 'degraded')),
  engine_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  overall_state VARCHAR(40),
  subsystem_statuses JSONB NOT NULL DEFAULT '{}',
  attention JSONB NOT NULL DEFAULT '[]',
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS monitoring_report_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type VARCHAR(20) NOT NULL
    CHECK (report_type IN ('daily', 'weekly', 'monthly')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  summary JSONB NOT NULL DEFAULT '{}',
  recommendations JSONB NOT NULL DEFAULT '[]',
  engine_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitoring_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(80) NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(40),
  resource_type VARCHAR(60),
  resource_id UUID,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  engine_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_audit_created
  ON monitoring_audit_logs (created_at DESC);

-- Seed known services (observational catalog — not inventing live health)
INSERT INTO monitoring_services (code, name, layer, is_critical) VALUES
  ('api', 'Atina API', 'api', TRUE),
  ('database', 'PostgreSQL', 'database', TRUE),
  ('redis', 'Redis', 'infrastructure', TRUE),
  ('web', 'Omnigroup Web', 'api', TRUE),
  ('payments', 'Payments / Stripe', 'payments', TRUE),
  ('email', 'Email / notifications', 'email', FALSE),
  ('omi', 'OMI assistant', 'omi', FALSE),
  ('queues', 'Background queues', 'infrastructure', FALSE),
  ('reinvestment', 'Reinvestment Engine', 'reinvestment', FALSE),
  ('monitoring', 'Monitoring Engine', 'monitoring', TRUE)
ON CONFLICT (code) DO NOTHING;

COMMIT;
