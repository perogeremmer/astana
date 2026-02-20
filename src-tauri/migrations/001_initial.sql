-- =====================================================
-- Astana - Database Schema v1.0 (English)
-- Grave Management System
-- =====================================================

-- -----------------------------------------------------
-- Table: blocks
-- Description: Grave block data and annual fee rates
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,                -- Example: A, B, C, D, E
    description TEXT,                          -- Location/facility description
    total_capacity INTEGER NOT NULL DEFAULT 0, -- Maximum graves in block
    annual_fee INTEGER NOT NULL DEFAULT 0,     -- Annual fee per grave (Rupiah)
    status TEXT NOT NULL DEFAULT 'active',     -- active/inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Table: graves
-- Description: Deceased person data
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS graves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deceased_name TEXT NOT NULL,               -- Full name of deceased
    block_id INTEGER NOT NULL,                 -- Reference to blocks table
    number TEXT NOT NULL,                      -- Grave number (e.g., 12, 05A)
    date_of_death DATE NOT NULL,               -- Date of death
    burial_date DATE,                          -- Burial date (optional)
    notes TEXT,                                -- Additional notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE RESTRICT,
    UNIQUE(block_id, number)                   -- Unique grave number per block
);

-- -----------------------------------------------------
-- Table: heirs
-- Description: Heir data (1-3 persons per grave)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS heirs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grave_id INTEGER NOT NULL,                 -- Reference to graves table
    order_number INTEGER NOT NULL DEFAULT 1,   -- Heir order (1, 2, 3)
    full_name TEXT NOT NULL,                   -- Full name of heir
    phone_number TEXT,                         -- Phone/WhatsApp number
    relationship TEXT,                         -- child, spouse, grandchild, sibling, other
    address TEXT,                              -- Full address
    is_primary BOOLEAN DEFAULT 0,              -- 1 = primary heir (order 1)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grave_id) REFERENCES graves(id) ON DELETE CASCADE,
    UNIQUE(grave_id, order_number)             -- Max 1 heir per order per grave
);

-- -----------------------------------------------------
-- Table: payments
-- Description: Annual fee payment history
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grave_id INTEGER NOT NULL,                 -- Reference to graves table
    year INTEGER NOT NULL,                     -- Payment year (2022, 2023, etc.)
    payment_date DATE NOT NULL,                -- Payment date
    amount INTEGER NOT NULL,                   -- Payment amount
    payment_method TEXT DEFAULT 'cash',        -- cash, transfer, qris, etc.
    payment_proof TEXT,                        -- Path to payment proof file
    paid_by TEXT,                              -- Name of payer (if different from heir)
    notes TEXT,                                -- Payment notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grave_id) REFERENCES graves(id) ON DELETE CASCADE,
    UNIQUE(grave_id, year)                     -- One payment per year per grave
);

-- -----------------------------------------------------
-- Table: settings
-- Description: Application configuration and foundation profile
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),     -- Single row
    foundation_name TEXT NOT NULL DEFAULT 'Wakaf Makam Foundation',
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_path TEXT,                            -- Logo file path
    active_year INTEGER DEFAULT (strftime('%Y', 'now')), -- Active application year
    last_backup TIMESTAMP,                     -- Last backup time
    auto_backup INTEGER DEFAULT 1,             -- 0 = off, 1 = on
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Indexes for optimization
-- -----------------------------------------------------

-- Block indexes
CREATE INDEX IF NOT EXISTS idx_graves_block_id ON graves(block_id);
CREATE INDEX IF NOT EXISTS idx_graves_deceased_name ON graves(deceased_name);

-- Grave number index (for faster lookup)
CREATE INDEX IF NOT EXISTS idx_graves_number ON graves(number);

-- Date indexes (for date range queries and reports)
CREATE INDEX IF NOT EXISTS idx_graves_date_of_death ON graves(date_of_death);
CREATE INDEX IF NOT EXISTS idx_graves_burial_date ON graves(burial_date);

-- Composite index for block + grave number searches
CREATE INDEX IF NOT EXISTS idx_graves_block_number ON graves(block_id, number);

-- Heir indexes
CREATE INDEX IF NOT EXISTS idx_heirs_grave_id ON heirs(grave_id);
CREATE INDEX IF NOT EXISTS idx_heirs_full_name ON heirs(full_name);
CREATE INDEX IF NOT EXISTS idx_heirs_phone ON heirs(phone_number);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_grave_id ON payments(grave_id);
CREATE INDEX IF NOT EXISTS idx_payments_year ON payments(year);
CREATE INDEX IF NOT EXISTS idx_payments_grave_year ON payments(grave_id, year);

-- Payment date index (for date range queries)
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- Composite index for year + payment date (for annual reports)
CREATE INDEX IF NOT EXISTS idx_payments_year_date ON payments(year, payment_date);

-- -----------------------------------------------------
-- Insert default data
-- -----------------------------------------------------

-- Insert default settings
INSERT OR IGNORE INTO settings (id, foundation_name, address, phone, active_year) VALUES
(1, 'Yayasan Wakaf Makam Al-Ikhlas', 'Jl. Raya Cipaku No. 123, Bandung City', '(022) 1234567', 2026);

-- -----------------------------------------------------
-- Triggers for auto-update timestamp
-- -----------------------------------------------------
CREATE TRIGGER IF NOT EXISTS update_blocks_timestamp 
AFTER UPDATE ON blocks
BEGIN
    UPDATE blocks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_graves_timestamp 
AFTER UPDATE ON graves
BEGIN
    UPDATE graves SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_heirs_timestamp 
AFTER UPDATE ON heirs
BEGIN
    UPDATE heirs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_payments_timestamp 
AFTER UPDATE ON payments
BEGIN
    UPDATE payments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_settings_timestamp 
AFTER UPDATE ON settings
BEGIN
    UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
