BEGIN;

-- Legacy DBs: `001_initial_schema` used CREATE TABLE IF NOT EXISTS, so an older
-- `users` shape could persist without `name` while the app + seeds expect it.
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

UPDATE users
SET name = COALESCE(
  NULLIF(TRIM(name), ''),
  NULLIF(split_part(email, '@', 1), ''),
  'User'
)
WHERE name IS NULL OR TRIM(name) = '';

ALTER TABLE users ALTER COLUMN name SET DEFAULT 'User';
ALTER TABLE users ALTER COLUMN name SET NOT NULL;

COMMIT;
