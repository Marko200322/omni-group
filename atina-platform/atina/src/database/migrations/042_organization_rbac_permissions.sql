-- Optional permission overrides on organization memberships.
-- Empty array means "use the role default map" in application code.
BEGIN;

ALTER TABLE organization_memberships
  ADD COLUMN IF NOT EXISTS permissions TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_org_memberships_role
  ON organization_memberships(role, status);

COMMIT;
