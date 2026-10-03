-- Fix: notifications had update_updated_at_column() trigger from 001 without updated_at column.
-- UPDATE is_read failed with: record "new" has no field "updated_at"
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
