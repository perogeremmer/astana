-- =====================================================
-- Astana - Database Schema v4.0 (Birth Fields)
-- Add birth place and birth date for deceased
-- =====================================================

-- Add birth_place column
ALTER TABLE graves ADD COLUMN birth_place TEXT;

-- Add birth_date column
ALTER TABLE graves ADD COLUMN birth_date DATE;

-- Index for birth date searches
CREATE INDEX IF NOT EXISTS idx_graves_birth_date ON graves(birth_date);

-- Note: date_of_death column exists but is not used (NULL)
-- burial_date is used for "Tanggal Dimakamkan"
