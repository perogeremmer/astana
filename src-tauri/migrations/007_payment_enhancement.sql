-- =====================================================
-- Astana - Database Schema v7.0 (Payment Enhancement)
-- Add user full_name and payment receiver tracking
-- =====================================================

-- -----------------------------------------------------
-- Add full_name to users table
-- -----------------------------------------------------
ALTER TABLE users ADD COLUMN full_name TEXT;

-- -----------------------------------------------------
-- Add inputted_by and received_by to payments table
-- -----------------------------------------------------
ALTER TABLE payments ADD COLUMN inputted_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN received_by TEXT;

-- -----------------------------------------------------
-- Index for payment receiver lookups
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_payments_inputted_by ON payments(inputted_by);
CREATE INDEX IF NOT EXISTS idx_payments_received_by ON payments(received_by);
