-- Enterprise tenant foundation: organizations, memberships, and scoped business rows.
BEGIN;

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'closed')),
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_memberships (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'operator', 'member', 'viewer')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'suspended')),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user
  ON organization_memberships(user_id, status);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS active_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Existing accounts become owners of isolated organizations. This preserves
-- current per-user access while enabling explicit team membership later.
INSERT INTO organizations (name, slug, owner_user_id)
SELECT
  COALESCE(NULLIF(TRIM(u.company), ''), NULLIF(TRIM(u.name), ''), 'Workspace'),
  'workspace-' || REPLACE(u.id::text, '-', ''),
  u.id
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.owner_user_id = u.id
);

INSERT INTO organization_memberships (organization_id, user_id, role, status, joined_at)
SELECT o.id, o.owner_user_id, 'owner', 'active', NOW()
FROM organizations o
ON CONFLICT (organization_id, user_id) DO NOTHING;

UPDATE users u
SET active_organization_id = o.id
FROM organizations o
WHERE o.owner_user_id = u.id
  AND u.active_organization_id IS NULL;

-- Add organization scope only where the table exists. Deployments created from
-- older phase profiles do not necessarily contain every optional module table.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'api_keys',
    'subscriptions',
    'payments',
    'invoices',
    'tasks',
    'crm_contacts',
    'contracts',
    'automation_workflows',
    'automation_tasks',
    'notifications'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE',
        table_name
      );
      -- Some legacy tables have update_updated_at_column() without updated_at.
      EXECUTE format('ALTER TABLE %I DISABLE TRIGGER USER', table_name);
      EXECUTE format(
        'UPDATE %I row SET organization_id = u.active_organization_id FROM users u WHERE row.user_id = u.id AND row.organization_id IS NULL',
        table_name
      );
      EXECUTE format('ALTER TABLE %I ENABLE TRIGGER USER', table_name);
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I (organization_id)',
        'idx_' || table_name || '_organization_id',
        table_name
      );
    END IF;
  END LOOP;
END $$;

COMMIT;

