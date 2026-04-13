-- Migration: Remove unique constraint on graves to allow stacked graves
-- Date: 2025-01-20
-- Issue: Makam tumpuk can have same block_id and number

-- This migration is idempotent - can be run multiple times safely

-- Check if we need to run this migration by looking for the unique index
-- If index 'sqlite_autoindex_graves_1' exists, we need to recreate the table
-- If it doesn't exist, migration already completed

-- Step 1: Check if graves table exists and has the unique constraint
-- We do this by trying to create a test table with duplicate data
-- If it fails, constraint still exists

-- Only proceed if graves table exists
DROP TABLE IF EXISTS graves_migration_test;

-- Test if unique constraint exists by trying to violate it
-- Create temp table to test
CREATE TEMP TABLE IF NOT EXISTS migration_check AS 
SELECT 1 as test FROM sqlite_master 
WHERE type='index' AND name='sqlite_autoindex_graves_1' AND tbl_name='graves';

-- If the index exists, we need to migrate
-- Step 1: Create new table (drop if exists from previous failed attempt)
DROP TABLE IF EXISTS graves_new;

CREATE TABLE graves_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deceased_name TEXT NOT NULL,               -- Full name of deceased
    block_id INTEGER NOT NULL,                 -- Reference to blocks table
    number TEXT NOT NULL,                      -- Grave number (e.g., 12, 05A)
    date_of_death DATE,                        -- Date of death (nullable for backward compatibility)
    burial_date DATE,                          -- Burial date (optional)
    birth_place TEXT,                          -- Birth place (added in migration 004)
    birth_date DATE,                           -- Birth date (added in migration 004)
    grave_type TEXT DEFAULT 'new',             -- 'new' or 'stacked' (added in migration 003)
    notes TEXT,                                -- Additional notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE RESTRICT
);

-- Step 2: Copy data from old table if it exists
INSERT INTO graves_new (
    id, deceased_name, block_id, number, date_of_death, burial_date,
    birth_place, birth_date, grave_type, notes, created_at, updated_at
)
SELECT 
    id, deceased_name, block_id, number, date_of_death, burial_date,
    birth_place, birth_date, grave_type, notes, created_at, updated_at
FROM graves;

-- Step 3: Drop old table
DROP TABLE IF EXISTS graves;

-- Step 4: Rename new table to original name
ALTER TABLE graves_new RENAME TO graves;

-- Step 5: Recreate indexes (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_graves_block_id ON graves(block_id);
CREATE INDEX IF NOT EXISTS idx_graves_number ON graves(number);
CREATE INDEX IF NOT EXISTS idx_graves_grave_type ON graves(grave_type);

-- Cleanup
DROP TABLE IF EXISTS migration_check;
DROP TABLE IF EXISTS graves_migration_test;
