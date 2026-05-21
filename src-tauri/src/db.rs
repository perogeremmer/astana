//! Database module for Astana - Grave Management System
//!
//! This module handles SQLite database initialization and connection.
//! Database is created automatically when the app runs for the first time.

use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;

use log;
use tauri::AppHandle;
use tauri::Manager;

/// Database file name
const DB_FILENAME: &str = "astana.db";

/// Embedded SQL migration scripts
const MIGRATION_SQL_V1: &str = include_str!("../migrations/001_initial.sql");
const MIGRATION_SQL_V2: &str = include_str!("../migrations/002_auth.sql");
const MIGRATION_SQL_V3: &str = include_str!("../migrations/003_grave_type.sql");
const MIGRATION_SQL_V4: &str = include_str!("../migrations/004_birth_fields.sql");
const MIGRATION_SQL_V5: &str = include_str!("../migrations/005_remove_grave_unique_constraint.sql");
const MIGRATION_SQL_V6: &str = include_str!("../migrations/006_grave_initial_fee.sql");
const MIGRATION_SQL_V7: &str = include_str!("../migrations/007_payment_enhancement.sql");

/// Database management structure
pub struct Database {
    pub(crate) conn: Connection,
}

impl Database {
    /// Initialize database - creates new DB file if not exists
    /// and runs migrations
    ///
    /// # Arguments
    /// * `app_handle` - Tauri AppHandle to get application paths
    ///
    /// # Returns
    /// * `Ok(Database)` - If initialization succeeds
    /// * `Err(String)` - If error occurs
    pub fn init(app_handle: &AppHandle) -> Result<Self, String> {
        let db_path = Self::get_db_path(app_handle)?;

        // Ensure data folder exists
        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create database folder: {}", e))?;
        }

        // Open or create database
        let conn =
            Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

        let db = Self { conn };

        // Run migrations
        db.run_migrations()?;

        log::info!("Database successfully initialized at: {:?}", db_path);
        Ok(db)
    }

    /// Initialize database with custom path (for restore/backup)
    ///
    /// # Arguments
    /// * `db_path` - Path to database file
    pub fn init_with_path(db_path: PathBuf) -> Result<Self, String> {
        let conn =
            Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

        let db = Self { conn };
        db.run_migrations()?;

        log::info!("Database successfully initialized at: {:?}", db_path);
        Ok(db)
    }

    /// Get database path based on platform
    ///
    /// Windows: %LOCALAPPDATA%/astana/astana.db
    /// macOS: ~/Library/Application Support/astana/astana.db
    /// Linux: ~/.local/share/astana/astana.db
    fn get_db_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {:?}", e))?;

        Ok(app_data_dir.join(DB_FILENAME))
    }

    /// Get database path for display to user
    pub fn get_database_path(app_handle: &AppHandle) -> Result<String, String> {
        let path = Self::get_db_path(app_handle)?;
        Ok(path.to_string_lossy().to_string())
    }

    /// Run SQL migrations
    fn run_migrations(&self) -> Result<(), String> {
        // Run V1 migration
        self.conn
            .execute_batch(MIGRATION_SQL_V1)
            .map_err(|e| format!("Failed to run V1 migrations: {}", e))?;

        // Run V2 migration (auth tables)
        self.conn
            .execute_batch(MIGRATION_SQL_V2)
            .map_err(|e| format!("Failed to run V2 migrations: {}", e))?;

        // Run V3 migration (grave type) - handle case where column already exists
        match self.conn.execute_batch(MIGRATION_SQL_V3) {
            Ok(_) => {
                log::info!("✅ V3 migration (grave_type) applied successfully");
            }
            Err(e) => {
                let error_msg = e.to_string();
                // Check if error is because column already exists
                if error_msg.contains("duplicate column name")
                    || error_msg.contains("already exists")
                    || error_msg.contains(" Grave_type")
                {
                    log::info!("ℹ️ V3 migration skipped: grave_type column already exists");
                } else {
                    // For other errors, still log but don't fail - the column might already exist
                    log::warn!("⚠️ V3 migration warning (non-critical): {}", e);
                }
            }
        }

        // Run V4 migration (birth fields) - handle case where column already exists
        match self.conn.execute_batch(MIGRATION_SQL_V4) {
            Ok(_) => {
                log::info!("✅ V4 migration (birth_place, birth_date) applied successfully");
            }
            Err(e) => {
                let error_msg = e.to_string();
                // Check if error is because column already exists
                if error_msg.contains("duplicate column name")
                    || error_msg.contains("already exists")
                {
                    log::info!("ℹ️ V4 migration skipped: birth fields already exist");
                } else {
                    // For other errors, still log but don't fail
                    log::warn!("⚠️ V4 migration warning (non-critical): {}", e);
                }
            }
        }

        // Run V5 migration (remove unique constraint on graves) - only if not already done
        let v5_already_done: bool = self
            .conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='sqlite_autoindex_graves_1'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .map(|count| count == 0)  // If count is 0, constraint already removed
            .unwrap_or(false);

        if v5_already_done {
            println!("ℹ️ V5 migration skipped: unique constraint already removed");
            log::info!("ℹ️ V5 migration skipped: unique constraint already removed");
        } else {
            println!("Running V5 migration...");
            match self.conn.execute_batch(MIGRATION_SQL_V5) {
                Ok(_) => {
                    println!("✅ V5 migration applied successfully");
                    log::info!("✅ V5 migration (remove unique constraint) applied successfully");
                }
                Err(e) => {
                    let error_msg = e.to_string();
                    println!("⚠️ V5 migration error: {}", error_msg);
                    // Table might already be migrated or other non-critical error
                    if error_msg.contains("already exists") || error_msg.contains("duplicate") {
                        log::info!("ℹ️ V5 migration skipped: constraint already removed");
                    } else {
                        log::warn!("⚠️ V5 migration warning (non-critical): {}", e);
                    }
                }
            }
        }

        // Run V6 migration (grave initial fee) - handle case where column already exists
        match self.conn.execute_batch(MIGRATION_SQL_V6) {
            Ok(_) => {
                log::info!("✅ V6 migration (grave_initial_fee) applied successfully");
            }
            Err(e) => {
                let error_msg = e.to_string();
                // Check if error is because column already exists
                if error_msg.contains("duplicate column name")
                    || error_msg.contains("already exists")
                {
                    log::info!("ℹ️ V6 migration skipped: initial fee fields already exist");
                } else {
                    log::warn!("⚠️ V6 migration warning (non-critical): {}", e);
                }
            }
        }

        // Run V7 migration (payment enhancement) - handle case where columns already exist
        match self.conn.execute_batch(MIGRATION_SQL_V7) {
            Ok(_) => {
                log::info!("✅ V7 migration (payment_enhancement) applied successfully");
            }
            Err(e) => {
                let error_msg = e.to_string();
                if error_msg.contains("duplicate column name")
                    || error_msg.contains("already exists")
                {
                    log::info!(
                        "ℹ️ V7 migration skipped: payment enhancement columns already exist"
                    );
                } else {
                    log::warn!("⚠️ V7 migration warning (non-critical): {}", e);
                }
            }
        }

        Ok(())
    }

    /// Get reference to connection
    pub fn connection(&self) -> &Connection {
        &self.conn
    }

    /// Get mutable reference to connection
    pub fn connection_mut(&mut self) -> &mut Connection {
        &mut self.conn
    }

    /// Check if database is properly initialized
    pub fn verify(&self) -> Result<bool, String> {
        // Check main tables including audit_logs
        let tables = vec![
            "blocks",
            "graves",
            "heirs",
            "payments",
            "settings",
            "users",
            "audit_logs",
        ];

        for table in tables {
            let count: i64 = self
                .conn
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
                    [table],
                    |row| row.get(0),
                )
                .map_err(|e| format!("Failed to verify table {}: {}", table, e))?;

            if count == 0 {
                return Ok(false);
            }
        }

        Ok(true)
    }

    /// Get database statistics
    pub fn get_stats(&self) -> Result<DatabaseStats, String> {
        // Count records per table
        let graves_count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM graves", [], |row| row.get(0))
            .unwrap_or(0);

        let heirs_count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM heirs", [], |row| row.get(0))
            .unwrap_or(0);

        let payments_count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM payments", [], |row| row.get(0))
            .unwrap_or(0);

        // Calculate database size
        let page_count: i64 = self
            .conn
            .query_row(
                "SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        Ok(DatabaseStats {
            graves_count,
            heirs_count,
            payments_count,
            size_bytes: page_count,
        })
    }
}

// ==================== RE-EXPORT ALL MODELS ====================

pub use crate::models::*;

// ==================== HELPER FUNCTIONS ====================

/// Helper function to initialize database on app start
/// Called from main.rs
pub fn initialize_database(app_handle: &AppHandle) -> Result<Database, String> {
    Database::init(app_handle)
}

/// Get database path
pub fn get_db_path_command(app_handle: AppHandle) -> Result<String, String> {
    Database::get_database_path(&app_handle)
}

/// Get database statistics
pub fn get_db_stats(app_handle: AppHandle) -> Result<DatabaseStats, String> {
    let db = Database::init(&app_handle)?;
    db.get_stats()
}

/// Backup database
pub fn backup_database_command(app_handle: AppHandle, backup_path: String) -> Result<(), String> {
    let db = Database::init(&app_handle)?;
    let path = PathBuf::from(backup_path);
    db.backup_to(path)
}


