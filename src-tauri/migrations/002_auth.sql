-- =====================================================
-- Astana - Database Schema v2.0 (Authentication & Audit)
-- User Management and Audit Logging
-- =====================================================

-- -----------------------------------------------------
-- Table: users
-- Description: User accounts with role-based access control
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,             -- Unique username (lowercase)
    password_hash TEXT NOT NULL,               -- Argon2 password hash
    role TEXT NOT NULL,                        -- superadmin_0, superadmin, admin
    is_active BOOLEAN DEFAULT 1,               -- 0 = inactive, 1 = active
    is_password_changed BOOLEAN DEFAULT 0,     -- 0 = must change password (first login)
    created_by INTEGER,                        -- Reference to users.id (NULL for superadmin_0)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (role IN ('superadmin_0', 'superadmin', 'admin'))
);

-- -----------------------------------------------------
-- Table: audit_logs
-- Description: Audit trail for all data changes
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,                           -- User who performed the action
    username TEXT,                             -- Denormalized for easier querying
    action TEXT NOT NULL,                      -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT, RESET_PASSWORD
    entity_type TEXT NOT NULL,                 -- block, grave, payment, heir, user
    entity_id INTEGER,                         -- ID of affected entity (NULL for LOGIN/LOGOUT)
    old_data TEXT,                             -- JSON string of old data (for UPDATE/DELETE)
    new_data TEXT,                             -- JSON string of new data (for CREATE/UPDATE)
    details TEXT,                              -- Additional details (e.g., "Reset password for user X")
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Indexes for optimization
-- -----------------------------------------------------

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_created_at_desc ON audit_logs(created_at DESC);

-- -----------------------------------------------------
-- Triggers for auto-update timestamp
-- -----------------------------------------------------
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- -----------------------------------------------------
-- Constraint: Only one superadmin_0
-- -----------------------------------------------------
CREATE TRIGGER IF NOT EXISTS ensure_single_superadmin_0
BEFORE INSERT ON users
WHEN NEW.role = 'superadmin_0'
BEGIN
    SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE role = 'superadmin_0') 
        THEN RAISE(ABORT, 'Only one superadmin_0 is allowed')
    END;
END;

CREATE TRIGGER IF NOT EXISTS ensure_single_superadmin_0_update
BEFORE UPDATE ON users
WHEN NEW.role = 'superadmin_0' AND OLD.role != 'superadmin_0'
BEGIN
    SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE role = 'superadmin_0' AND id != OLD.id) 
        THEN RAISE(ABORT, 'Only one superadmin_0 is allowed')
    END;
END;
