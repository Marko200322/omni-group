-- Per-client public websites (multi-tenant marketing sites)

CREATE TABLE IF NOT EXISTS client_public_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES product_factory_projects(id) ON DELETE SET NULL,
  slug VARCHAR(128) NOT NULL UNIQUE,
  custom_domain VARCHAR(255),
  title TEXT NOT NULL,
  tagline TEXT,
  site_type VARCHAR(32) NOT NULL DEFAULT 'business'
    CHECK (site_type IN ('landing', 'business', 'ecommerce')),
  branding JSONB NOT NULL DEFAULT '{}',
  pages JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_public_sites_owner
  ON client_public_sites (owner_user_id, status);

CREATE INDEX IF NOT EXISTS idx_client_public_sites_status
  ON client_public_sites (status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_public_sites_domain
  ON client_public_sites (custom_domain)
  WHERE custom_domain IS NOT NULL;

COMMENT ON TABLE client_public_sites IS
  'Published client marketing sites — /sites/{slug} on omnigroup-web';

INSERT INTO schema_migrations (version) VALUES ('022_client_public_sites')
ON CONFLICT DO NOTHING;
