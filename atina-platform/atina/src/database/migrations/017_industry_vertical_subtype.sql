BEGIN;

ALTER TABLE industry_verticals
  ADD COLUMN IF NOT EXISTS subtype VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_industry_verticals_subtype ON industry_verticals(subtype);

-- Backfill subtype from slug (category-subtype pattern)
UPDATE industry_verticals v
SET subtype = SUBSTRING(v.slug FROM LENGTH(REPLACE(v.category, '_', '-')) + 2)
WHERE v.subtype IS NULL
  AND v.slug LIKE REPLACE(v.category, '_', '-') || '-%';

COMMIT;
