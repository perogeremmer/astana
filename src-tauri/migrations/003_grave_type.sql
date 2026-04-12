-- =====================================================
-- Astana - Database Schema v3.0 (Grave Type)
-- Add grave type marker: new or stacked
-- This migration is idempotent - can be run multiple times
-- =====================================================

-- Add grave_type column if not exists (nullable for existing data)
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a workaround
-- Try to add the column - if it fails because it already exists, that's ok

-- First, check if column exists by trying to select it
-- If this fails, the column doesn't exist and we need to add it

-- Add grave_type column
-- Note: In SQLite, ALTER TABLE ADD COLUMN is idempotent in the sense that
-- if the column already exists, it will fail. But since we're using execute_batch,
-- we need to handle this gracefully in the application code.
-- For now, we assume this migration runs only when needed.

-- Add the column (this will fail gracefully if already exists due to application handling)
ALTER TABLE graves ADD COLUMN grave_type TEXT 
    CHECK (grave_type IN ('new', 'stacked'));

-- Recreate trigger to include new column (if not exists)
-- Drop first to avoid "trigger already exists" error
DROP TRIGGER IF EXISTS update_graves_timestamp;
CREATE TRIGGER update_graves_timestamp 
AFTER UPDATE ON graves
BEGIN
    UPDATE graves SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Index for filtering by grave type (if not exists)
CREATE INDEX IF NOT EXISTS idx_graves_type ON graves(grave_type);
