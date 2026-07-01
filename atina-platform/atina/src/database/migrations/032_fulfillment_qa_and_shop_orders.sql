-- QA review gate before client sees deliverables
ALTER TABLE deliverable_fulfillment_jobs
  ADD COLUMN IF NOT EXISTS review_status VARCHAR(32) NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;

UPDATE deliverable_fulfillment_jobs
SET review_status = 'approved',
    released_at = COALESCE(completed_at, updated_at)
WHERE status = 'completed' AND review_status = 'pending_review';

CREATE INDEX IF NOT EXISTS idx_deliverable_fulfillment_jobs_review
  ON deliverable_fulfillment_jobs (review_status, created_at DESC);

-- E-commerce orders from client public sites
CREATE TABLE IF NOT EXISTS client_site_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES client_public_sites(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_phone VARCHAR(64),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  payment_reference VARCHAR(64),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_site_orders_owner
  ON client_site_orders (owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_site_orders_site
  ON client_site_orders (site_id, created_at DESC);
