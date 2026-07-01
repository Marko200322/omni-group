-- Automatic delivery jobs after admin payment confirmation
CREATE TABLE IF NOT EXISTS deliverable_fulfillment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purchase_type VARCHAR(32) NOT NULL CHECK (purchase_type IN ('deliverable', 'platform_plan')),
  deliverable_id VARCHAR(80),
  plan_slug VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deliverable_fulfillment_jobs_user
  ON deliverable_fulfillment_jobs (user_id, status);

CREATE INDEX IF NOT EXISTS idx_deliverable_fulfillment_jobs_status
  ON deliverable_fulfillment_jobs (status, created_at);

COMMENT ON TABLE deliverable_fulfillment_jobs IS
  'Auto-fulfillment after payment confirm — product factory, public sites, plan onboarding.';
