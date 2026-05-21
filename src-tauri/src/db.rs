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


// ==================== TESTS ====================

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    // Helper function to create a temporary database for testing
    fn create_test_db() -> (Database, std::path::PathBuf) {
        let temp_path = env::temp_dir().join(format!("test_astana_{}.db", uuid::Uuid::new_v4()));

        // Delete old file if exists
        if temp_path.exists() {
            fs::remove_file(&temp_path).unwrap();
        }

        let db = Database::init_with_path(temp_path.clone()).unwrap();
        (db, temp_path)
    }

    fn cleanup_test_db(path: &std::path::Path) {
        if path.exists() {
            fs::remove_file(path).unwrap();
        }
    }

    #[test]
    fn test_database_init() {
        let (db, temp_path) = create_test_db();

        // Verify tables created
        assert!(db.verify().unwrap());

        // Cleanup
        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_database_stats() {
        let (db, temp_path) = create_test_db();

        let stats = db.get_stats().unwrap();

        // Verify stats
        assert!(stats.graves_count >= 0);
        assert!(stats.size_bytes >= 0);

        // Cleanup
        cleanup_test_db(&temp_path);
    }

    // ==================== AUTHENTICATION TESTS ====================

    #[test]
    fn test_password_hashing_and_verification() {
        let password = "test_password_123";

        // Test hashing
        let hash = Database::hash_password(password).unwrap();
        assert!(!hash.is_empty());
        assert_ne!(hash, password); // Hash should not be the same as plaintext

        // Test verification with correct password
        let is_valid = Database::verify_password(password, &hash).unwrap();
        assert!(is_valid);

        // Test verification with wrong password
        let is_invalid = Database::verify_password("wrong_password", &hash).unwrap();
        assert!(!is_invalid);
    }

    #[test]
    fn test_is_users_empty() {
        let (db, temp_path) = create_test_db();

        // Should be empty initially
        assert!(db.is_users_empty().unwrap());

        // Create a user
        let password = "test_password";
        db.create_superadmin_0(password).unwrap();

        // Should not be empty now
        assert!(!db.is_users_empty().unwrap());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_create_superadmin_0() {
        let (db, temp_path) = create_test_db();

        let password = "superadmin_password";
        let user = db.create_superadmin_0(password).unwrap();

        assert_eq!(user.username, "superadmin");
        assert_eq!(user.role, "superadmin_0");
        assert!(user.is_active);
        assert!(!user.is_password_changed);
        assert!(user.created_by.is_none());

        // Verify password works
        let login_result = db.login("superadmin", password).unwrap();
        assert!(login_result.success);
        assert!(login_result.must_change_password); // Superadmin_0 must change password on first login

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_login_success() {
        let (db, temp_path) = create_test_db();

        // Create superadmin
        let password = "test_password";
        db.create_superadmin_0(password).unwrap();

        // Test successful login
        let result = db.login("superadmin", password).unwrap();
        assert!(result.success);
        assert!(result.user.is_some());
        assert_eq!(result.user.unwrap().role, "superadmin_0");

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_login_failure_wrong_password() {
        let (db, temp_path) = create_test_db();

        // Create superadmin
        db.create_superadmin_0("correct_password").unwrap();

        // Test login with wrong password
        let result = db.login("superadmin", "wrong_password").unwrap();
        assert!(!result.success);
        assert!(result.user.is_none());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_login_failure_invalid_username() {
        let (db, temp_path) = create_test_db();

        // Try to login with non-existent user
        let result = db.login("nonexistent", "password").unwrap();
        assert!(!result.success);
        assert!(result.user.is_none());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_login_inactive_user() {
        let (db, temp_path) = create_test_db();

        // Create admin user
        db.create_superadmin_0("admin_password").unwrap();

        // Create another user
        let user_req = CreateUserRequest {
            username: "testadmin".to_string(),
            password: "test_password".to_string(),
            full_name: None,
            role: "admin".to_string(),
        };
        let user_id = db.create_user(&user_req, 1).unwrap();

        // Deactivate user
        let update_req = UpdateUserRequest {
            full_name: None,
            role: None,
            is_active: Some(false),
        };
        db.update_user(user_id, &update_req, 1).unwrap();

        // Try to login with inactive user
        let result = db.login("testadmin", "test_password").unwrap();
        assert!(!result.success);
        assert!(result.message.contains("tidak aktif"));

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_change_password() {
        let (db, temp_path) = create_test_db();

        // Create superadmin
        db.create_superadmin_0("old_password").unwrap();

        // Login to get user
        let user = db
            .get_user_by_username_with_hash("superadmin")
            .unwrap()
            .unwrap();

        // Change password
        let result = db
            .change_password(user.id, Some("old_password"), "new_password", false)
            .unwrap();
        assert!(result.is_ok());

        // Verify old password doesn't work
        let old_login = db.login("superadmin", "old_password").unwrap();
        assert!(!old_login.success);

        // Verify new password works
        let new_login = db.login("superadmin", "new_password").unwrap();
        assert!(new_login.success);
        assert!(new_login.user.unwrap().is_password_changed);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_change_password_wrong_old_password() {
        let (db, temp_path) = create_test_db();

        // Create superadmin
        db.create_superadmin_0("correct_password").unwrap();

        let user = db
            .get_user_by_username_with_hash("superadmin")
            .unwrap()
            .unwrap();

        // Try to change with wrong old password
        let result = db
            .change_password(user.id, Some("wrong_password"), "new_password", false)
            .unwrap();
        assert!(result.is_err());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_create_user() {
        let (db, temp_path) = create_test_db();

        // Create superadmin first
        db.create_superadmin_0("admin_password").unwrap();

        // Create new user
        let user_req = CreateUserRequest {
            username: "testuser".to_string(),
            password: "test_password".to_string(),
            full_name: None,
            role: "admin".to_string(),
        };

        let user_id = db.create_user(&user_req, 1).unwrap();
        assert!(user_id > 0);

        // Verify user exists
        let user = db.get_user_by_id(user_id).unwrap().unwrap();
        assert_eq!(user.username, "testuser");
        assert_eq!(user.role, "admin");
        assert!(user.is_active);
        assert!(!user.is_password_changed);
        assert_eq!(user.created_by, Some(1));

        // Verify can login
        let login_result = db.login("testuser", "test_password").unwrap();
        assert!(login_result.success);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_create_user_validation() {
        let (db, temp_path) = create_test_db();

        // Create superadmin first
        db.create_superadmin_0("admin_password").unwrap();

        // Test empty username
        let user_req = CreateUserRequest {
            username: "".to_string(),
            password: "password123".to_string(),
            full_name: None,
            role: "admin".to_string(),
        };
        let result = db.create_user(&user_req, 1);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("kosong"));

        // Test short username
        let user_req = CreateUserRequest {
            username: "ab".to_string(),
            password: "password123".to_string(),
            full_name: None,
            role: "admin".to_string(),
        };
        let result = db.create_user(&user_req, 1);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("minimal"));

        // Test invalid role
        let user_req = CreateUserRequest {
            username: "testuser".to_string(),
            password: "password123".to_string(),
            full_name: None,
            role: "invalid_role".to_string(),
        };
        let result = db.create_user(&user_req, 1);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("tidak valid"));

        // Test short password
        let user_req = CreateUserRequest {
            username: "testuser".to_string(),
            password: "123".to_string(),
            full_name: None,
            role: "admin".to_string(),
        };
        let result = db.create_user(&user_req, 1);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Password"));

        // Test duplicate username
        let user_req = CreateUserRequest {
            username: "testuser".to_string(),
            password: "password123".to_string(),
            full_name: None,
            role: "admin".to_string(),
        };
        db.create_user(&user_req, 1).unwrap();

        // Try create with same username
        let result = db.create_user(&user_req, 1);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("sudah ada"));

        // Test case insensitive duplicate
        let user_req = CreateUserRequest {
            username: "TESTUSER".to_string(),
            password: "password123".to_string(),
            full_name: None,
            role: "admin".to_string(),
        };
        let result = db.create_user(&user_req, 1);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("sudah ada"));

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_all_users() {
        let (db, temp_path) = create_test_db();

        // Create superadmin
        db.create_superadmin_0("admin_password").unwrap();

        // Create additional users
        let user1 = CreateUserRequest {
            username: "user1".to_string(),
            password: "password1".to_string(),
            full_name: None,
            role: "admin".to_string(),
        };
        let user2 = CreateUserRequest {
            username: "user2".to_string(),
            password: "password2".to_string(),
            full_name: None,
            role: "superadmin".to_string(),
        };

        db.create_user(&user1, 1).unwrap();
        db.create_user(&user2, 1).unwrap();

        // Get all users
        let users = db.get_all_users().unwrap();
        assert_eq!(users.len(), 3); // superadmin_0 + 2 users

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_update_user() {
        let (db, temp_path) = create_test_db();

        // Create superadmin
        db.create_superadmin_0("admin_password").unwrap();

        // Create user
        let user_req = CreateUserRequest {
            username: "testuser".to_string(),
            password: "password".to_string(),
            full_name: None,
            role: "admin".to_string(),
        };
        let user_id = db.create_user(&user_req, 1).unwrap();

        // Update user
        let update_req = UpdateUserRequest {
            full_name: None,
            role: Some("superadmin".to_string()),
            is_active: Some(false),
        };
        db.update_user(user_id, &update_req, 1).unwrap();

        // Verify changes
        let user = db.get_user_by_id(user_id).unwrap().unwrap();
        assert_eq!(user.role, "superadmin");
        assert!(!user.is_active);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_delete_user() {
        let (db, temp_path) = create_test_db();

        // Create superadmin
        db.create_superadmin_0("admin_password").unwrap();

        // Create user
        let user_req = CreateUserRequest {
            username: "testuser".to_string(),
            password: "password".to_string(),
            full_name: None,
            role: "admin".to_string(),
        };
        let user_id = db.create_user(&user_req, 1).unwrap();

        // Delete user
        let result = db.delete_user(user_id, 1).unwrap();
        assert!(result.is_ok());

        // Verify user is gone
        assert!(db.get_user_by_id(user_id).unwrap().is_none());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_cannot_delete_superadmin_0() {
        let (db, temp_path) = create_test_db();

        // Create superadmin
        let user = db.create_superadmin_0("password").unwrap();

        // Try to delete superadmin_0
        let result = db.delete_user(user.id, user.id).unwrap();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("tidak dapat dihapus"));

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_cannot_delete_self() {
        let (db, temp_path) = create_test_db();

        // Create superadmin
        let user = db.create_superadmin_0("password").unwrap();

        // Create another user
        let user_req = CreateUserRequest {
            username: "testuser".to_string(),
            password: "password".to_string(),
            full_name: None,
            role: "admin".to_string(),
        };
        let user_id = db.create_user(&user_req, user.id).unwrap();

        // Try to delete self
        let result = db.delete_user(user_id, user_id).unwrap();
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("tidak dapat menghapus akun sendiri"));

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_reset_password() {
        let (db, temp_path) = create_test_db();

        // Create superadmin
        db.create_superadmin_0("admin_password").unwrap();

        // Create user
        let user_req = CreateUserRequest {
            username: "testuser".to_string(),
            password: "old_password".to_string(),
            full_name: None,
            role: "admin".to_string(),
        };
        let user_id = db.create_user(&user_req, 1).unwrap();

        // Verify old password works
        let old_login = db.login("testuser", "old_password").unwrap();
        assert!(old_login.success);

        // Reset password
        db.reset_user_password(user_id, "new_password", 1).unwrap();

        // Verify old password doesn't work
        let old_login = db.login("testuser", "old_password").unwrap();
        assert!(!old_login.success);

        // Verify new password works
        let new_login = db.login("testuser", "new_password").unwrap();
        assert!(new_login.success);
        assert!(!new_login.user.unwrap().is_password_changed); // Should be reset to false

        cleanup_test_db(&temp_path);
    }

    // ==================== AUDIT LOG TESTS ====================

    #[test]
    fn test_audit_logging() {
        let (db, temp_path) = create_test_db();

        // Create superadmin
        db.create_superadmin_0("password").unwrap();

        // Log something
        db.log_audit(
            Some(1),
            Some("superadmin"),
            "CREATE",
            "user",
            Some(2),
            None,
            Some("{\"test\": \"data\"}"),
            Some("Test audit log"),
        )
        .unwrap();

        // Get audit logs
        let logs = db.get_audit_logs(10, 0).unwrap();
        assert_eq!(logs.len(), 1);

        let log = &logs[0];
        assert_eq!(log.user_id, Some(1));
        assert_eq!(log.username, Some("superadmin".to_string()));
        assert_eq!(log.action, "CREATE");
        assert_eq!(log.entity_type, "user");
        assert_eq!(log.entity_id, Some(2));
        assert_eq!(log.details, Some("Test audit log".to_string()));

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_audit_log_count() {
        let (db, temp_path) = create_test_db();

        // Create superadmin
        db.create_superadmin_0("password").unwrap();

        // Check initial count
        let initial_count = db.count_audit_logs().unwrap();

        // Create multiple logs
        for i in 0..5 {
            db.log_audit(
                Some(1),
                Some("superadmin"),
                "TEST",
                "test",
                Some(i),
                None,
                None,
                None,
            )
            .unwrap();
        }

        // Check count increased
        let new_count = db.count_audit_logs().unwrap();
        assert_eq!(new_count, initial_count + 5);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_audit_logs_pagination() {
        let (db, temp_path) = create_test_db();

        // Create superadmin
        db.create_superadmin_0("password").unwrap();

        // Create 5 logs
        for i in 0..5 {
            db.log_audit(
                Some(1),
                Some("superadmin"),
                "TEST",
                "test",
                Some(i),
                None,
                None,
                None,
            )
            .unwrap();
        }

        // Get first 2 logs
        let logs_page1 = db.get_audit_logs(2, 0).unwrap();
        assert_eq!(logs_page1.len(), 2);

        // Get next 2 logs
        let logs_page2 = db.get_audit_logs(2, 2).unwrap();
        assert_eq!(logs_page2.len(), 2);

        // Verify different pages
        assert_ne!(logs_page1[0].id, logs_page2[0].id);

        cleanup_test_db(&temp_path);
    }

    // ==================== GENERATE RANDOM PASSWORD TESTS ====================

    #[test]
    fn test_generate_random_password() {
        let password1 = Database::generate_random_password();
        let password2 = Database::generate_random_password();

        // Should be 12 characters
        assert_eq!(password1.len(), 12);
        assert_eq!(password2.len(), 12);

        // Should be alphanumeric
        assert!(password1.chars().all(|c| c.is_ascii_alphanumeric()));

        // Should generate different passwords
        assert_ne!(password1, password2);
    }

    // ==================== BLOCKS CRUD TESTS ====================

    #[test]
    fn test_get_all_blocks_empty() {
        let (db, temp_path) = create_test_db();

        let blocks = db.get_all_blocks().unwrap();
        assert!(blocks.is_empty());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_all_blocks_with_data() {
        let (db, temp_path) = create_test_db();

        // Create blocks in non-sorted order to test sorting
        db.create_block(&CreateBlockRequest {
            code: "C".to_string(),
            description: Some("Block C".to_string()),
            total_capacity: 30,
            annual_fee: 15000,
            status: "active".to_string(),
        }).unwrap();

        db.create_block(&CreateBlockRequest {
            code: "A".to_string(),
            description: Some("Block A".to_string()),
            total_capacity: 20,
            annual_fee: 20000,
            status: "active".to_string(),
        }).unwrap();

        db.create_block(&CreateBlockRequest {
            code: "B".to_string(),
            description: Some("Block B".to_string()),
            total_capacity: 25,
            annual_fee: 18000,
            status: "inactive".to_string(),
        }).unwrap();

        let blocks = db.get_all_blocks().unwrap();
        assert_eq!(blocks.len(), 3);
        assert_eq!(blocks[0].code, "A");
        assert_eq!(blocks[1].code, "B");
        assert_eq!(blocks[2].code, "C");

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_block_by_id_exists() {
        let (db, temp_path) = create_test_db();

        let id = db.create_block(&CreateBlockRequest {
            code: "X".to_string(),
            description: Some("Blok X".to_string()),
            total_capacity: 50,
            annual_fee: 25000,
            status: "active".to_string(),
        }).unwrap();

        let block = db.get_block_by_id(id).unwrap().expect("Block should exist");
        assert_eq!(block.code, "X");
        assert_eq!(block.description.as_deref(), Some("Blok X"));
        assert_eq!(block.total_capacity, 50);
        assert_eq!(block.annual_fee, 25000);
        assert_eq!(block.status, "active");

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_block_by_id_not_found() {
        let (db, temp_path) = create_test_db();

        let block = db.get_block_by_id(9999).unwrap();
        assert!(block.is_none());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_create_block_success() {
        let (db, temp_path) = create_test_db();

        let id = db.create_block(&CreateBlockRequest {
            code: "TEST".to_string(),
            description: None,
            total_capacity: 10,
            annual_fee: 10000,
            status: "active".to_string(),
        }).unwrap();

        assert!(id > 0);

        let block = db.get_block_by_id(id).unwrap().expect("Block should exist");
        assert_eq!(block.code, "TEST");
        assert_eq!(block.description, Some(String::new()));

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_create_block_duplicate_code() {
        let (db, temp_path) = create_test_db();

        db.create_block(&CreateBlockRequest {
            code: "DUPE".to_string(),
            description: None,
            total_capacity: 10,
            annual_fee: 10000,
            status: "active".to_string(),
        }).unwrap();

        let result = db.create_block(&CreateBlockRequest {
            code: "DUPE".to_string(),
            description: None,
            total_capacity: 20,
            annual_fee: 20000,
            status: "active".to_string(),
        });

        assert!(result.is_err(), "Duplicate block code should return error");

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_update_block() {
        let (db, temp_path) = create_test_db();

        let id = db.create_block(&CreateBlockRequest {
            code: "OLD".to_string(),
            description: Some("Old description".to_string()),
            total_capacity: 10,
            annual_fee: 10000,
            status: "active".to_string(),
        }).unwrap();

        db.update_block(id, &UpdateBlockRequest {
            code: Some("NEW".to_string()),
            description: Some("New description".to_string()),
            total_capacity: Some(20),
            annual_fee: Some(20000),
            status: Some("inactive".to_string()),
        }).unwrap();

        let block = db.get_block_by_id(id).unwrap().expect("Block should exist");
        assert_eq!(block.code, "NEW");
        assert_eq!(block.description.as_deref(), Some("New description"));
        assert_eq!(block.total_capacity, 20);
        assert_eq!(block.annual_fee, 20000);
        assert_eq!(block.status, "inactive");

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_delete_block() {
        let (db, temp_path) = create_test_db();

        let id = db.create_block(&CreateBlockRequest {
            code: "DEL".to_string(),
            description: None,
            total_capacity: 5,
            annual_fee: 5000,
            status: "active".to_string(),
        }).unwrap();

        db.delete_block(id).unwrap();

        let blocks = db.get_all_blocks().unwrap();
        assert!(blocks.is_empty());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_delete_block_with_graves_fails() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "BLK".to_string(),
            description: None,
            total_capacity: 10,
            annual_fee: 10000,
            status: "active".to_string(),
        }).unwrap();

        // Create a grave in the block
        db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(),
            block_id,
            number: "01".to_string(),
            date_of_death: "2024-01-01".to_string(),
            burial_date: None,
            birth_place: None,
            birth_date: None,
            notes: None,
            grave_type: "new".to_string(),
            initial_fee_amount: 0,
            initial_fee_payment_date: None,
            initial_fee_payment_method: None,
            initial_fee_payment_proof: None,
        }).unwrap();

        let result = db.delete_block(block_id);
        assert!(result.is_err(), "Deleting block with graves should fail");
        assert!(result.unwrap_err().contains("grave"), "Error should mention graves");

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_block_stats() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "STAT".to_string(),
            description: None,
            total_capacity: 10,
            annual_fee: 10000,
            status: "active".to_string(),
        }).unwrap();

        // Should be all available initially
        let stats = db.get_block_stats(block_id).unwrap();
        assert_eq!(stats.total_capacity, 10);
        assert_eq!(stats.occupied, 0);
        assert_eq!(stats.available, 10);

        // Add 3 graves
        for i in 1..=3 {
            db.create_grave(&CreateGraveRequest {
                deceased_name: format!("Almarhum {}", i),
                block_id,
                number: format!("{:02}", i),
                date_of_death: "2024-01-01".to_string(),
                burial_date: None,
                birth_place: None,
                birth_date: None,
                notes: None,
                grave_type: "new".to_string(),
                initial_fee_amount: 0,
                initial_fee_payment_date: None,
                initial_fee_payment_method: None,
                initial_fee_payment_proof: None,
            }).unwrap();
        }

        let stats = db.get_block_stats(block_id).unwrap();
        assert_eq!(stats.occupied, 3);
        assert_eq!(stats.available, 7);

        cleanup_test_db(&temp_path);
    }

    // ==================== GRAVES CRUD TESTS ====================

    #[test]
    fn test_get_graves_empty() {
        let (db, temp_path) = create_test_db();

        let graves = db.get_graves(None, None, 10, 0, None, None).unwrap();
        assert!(graves.is_empty());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_graves_with_data() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(),
            description: None,
            total_capacity: 50,
            annual_fee: 10000,
            status: "active".to_string(),
        }).unwrap();

        db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum Satu".to_string(),
            block_id,
            number: "01".to_string(),
            date_of_death: "2024-01-15".to_string(),
            burial_date: Some("2024-01-16".to_string()),
            birth_place: Some("Jakarta".to_string()),
            birth_date: Some("1950-01-01".to_string()),
            notes: Some("Catatan".to_string()),
            grave_type: "new".to_string(),
            initial_fee_amount: 50000,
            initial_fee_payment_date: Some("2024-01-16".to_string()),
            initial_fee_payment_method: Some("cash".to_string()),
            initial_fee_payment_proof: None,
        }).unwrap();

        db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum Dua".to_string(),
            block_id,
            number: "02".to_string(),
            date_of_death: "2024-02-20".to_string(),
            burial_date: None,
            birth_place: None,
            birth_date: None,
            notes: None,
            grave_type: "stacked".to_string(),
            initial_fee_amount: 0,
            initial_fee_payment_date: None,
            initial_fee_payment_method: None,
            initial_fee_payment_proof: None,
        }).unwrap();

        let graves = db.get_graves(None, None, 10, 0, None, None).unwrap();
        assert_eq!(graves.len(), 2);
        assert_eq!(graves[0].deceased_name, "Almarhum Satu");
        assert_eq!(graves[0].code, "A");
        assert_eq!(graves[0].number, "01");

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_graves_pagination() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(),
            description: None,
            total_capacity: 100,
            annual_fee: 10000,
            status: "active".to_string(),
        }).unwrap();

        // Create 35 graves
        for i in 1..=35 {
            db.create_grave(&CreateGraveRequest {
                deceased_name: format!("Almarhum {}", i),
                block_id,
                number: format!("{:02}", i),
                date_of_death: "2024-01-01".to_string(),
                burial_date: None,
                birth_place: None,
                birth_date: None,
                notes: None,
                grave_type: "new".to_string(),
                initial_fee_amount: 0,
                initial_fee_payment_date: None,
                initial_fee_payment_method: None,
                initial_fee_payment_proof: None,
            }).unwrap();
        }

        // Page 1 should have 30 items
        let page1 = db.get_graves(None, None, 30, 0, None, None).unwrap();
        assert_eq!(page1.len(), 30);

        // Page 2 should have 5 items
        let page2 = db.get_graves(None, None, 30, 30, None, None).unwrap();
        assert_eq!(page2.len(), 5);

        // Different pages should have different data
        assert_ne!(page1[0].id, page2[0].id);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_graves_search() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(),
            description: None,
            total_capacity: 50,
            annual_fee: 10000,
            status: "active".to_string(),
        }).unwrap();

        db.create_grave(&CreateGraveRequest {
            deceased_name: "Ahmad".to_string(),
            block_id,
            number: "01".to_string(),
            date_of_death: "2024-01-01".to_string(),
            burial_date: None,
            birth_place: None,
            birth_date: None,
            notes: None,
            grave_type: "new".to_string(),
            initial_fee_amount: 0,
            initial_fee_payment_date: None,
            initial_fee_payment_method: None,
            initial_fee_payment_proof: None,
        }).unwrap();

        db.create_grave(&CreateGraveRequest {
            deceased_name: "Budi".to_string(),
            block_id,
            number: "02".to_string(),
            date_of_death: "2024-01-01".to_string(),
            burial_date: None,
            birth_place: None,
            birth_date: None,
            notes: None,
            grave_type: "new".to_string(),
            initial_fee_amount: 0,
            initial_fee_payment_date: None,
            initial_fee_payment_method: None,
            initial_fee_payment_proof: None,
        }).unwrap();

        // Search by name
        let results = db.get_graves(Some("Ahmad".to_string()), None, 10, 0, None, None).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].deceased_name, "Ahmad");

        // Search by grave number
        let results = db.get_graves(Some("02".to_string()), None, 10, 0, None, None).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].deceased_name, "Budi");

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_graves_filter_by_block() {
        let (db, temp_path) = create_test_db();

        let block_a = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 10000, status: "active".to_string(),
        }).unwrap();

        let block_b = db.create_block(&CreateBlockRequest {
            code: "B".to_string(), description: None, total_capacity: 50, annual_fee: 10000, status: "active".to_string(),
        }).unwrap();

        db.create_grave(&CreateGraveRequest {
            deceased_name: "User A1".to_string(), block_id: block_a, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        db.create_grave(&CreateGraveRequest {
            deceased_name: "User A2".to_string(), block_id: block_a, number: "02".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        db.create_grave(&CreateGraveRequest {
            deceased_name: "User B1".to_string(), block_id: block_b, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        let block_a_graves = db.get_graves(None, Some(block_a), 10, 0, None, None).unwrap();
        assert_eq!(block_a_graves.len(), 2);

        let block_b_graves = db.get_graves(None, Some(block_b), 10, 0, None, None).unwrap();
        assert_eq!(block_b_graves.len(), 1);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_create_grave_success() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 10000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum Test".to_string(),
            block_id,
            number: "10".to_string(),
            date_of_death: "2024-03-15".to_string(),
            burial_date: Some("2024-03-16".to_string()),
            birth_place: Some("Bandung".to_string()),
            birth_date: Some("1960-05-20".to_string()),
            notes: Some("Catatan test".to_string()),
            grave_type: "new".to_string(),
            initial_fee_amount: 75000,
            initial_fee_payment_date: Some("2024-03-16".to_string()),
            initial_fee_payment_method: Some("transfer".to_string()),
            initial_fee_payment_proof: None,
        }).unwrap();

        assert!(grave_id > 0);

        let grave = db.get_grave_by_id(grave_id).unwrap().expect("Grave should exist");
        assert_eq!(grave.deceased_name, "Almarhum Test");
        assert_eq!(grave.number, "10");
        assert_eq!(grave.code, "A");
        assert_eq!(grave.initial_fee_amount, 75000);
        assert_eq!(grave.grave_type, Some("new".to_string()));

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_grave_by_id_not_found() {
        let (db, temp_path) = create_test_db();

        let grave = db.get_grave_by_id(9999).unwrap();
        assert!(grave.is_none());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_update_grave() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 10000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Old Name".to_string(), block_id, number: "05".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        db.update_grave(grave_id, &UpdateGraveRequest {
            deceased_name: Some("New Name".to_string()),
            number: Some("99".to_string()),
            grave_type: Some("stacked".to_string()),
            block_id: None,
            date_of_death: None,
            burial_date: None,
            birth_place: None,
            birth_date: None,
            notes: None,
            initial_fee_amount: None,
            initial_fee_payment_date: None,
            initial_fee_payment_method: None,
            initial_fee_payment_proof: None,
        }).unwrap();

        let grave = db.get_grave_by_id(grave_id).unwrap().expect("Grave should exist");
        assert_eq!(grave.deceased_name, "New Name");
        assert_eq!(grave.number, "99");
        assert_eq!(grave.grave_type, Some("stacked".to_string()));

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_delete_grave() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 10000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "To Delete".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        db.delete_grave(grave_id).unwrap();

        let grave = db.get_grave_by_id(grave_id).unwrap();
        assert!(grave.is_none());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_count_graves() {
        let (db, temp_path) = create_test_db();

        let block_a = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 10000, status: "active".to_string(),
        }).unwrap();

        let block_b = db.create_block(&CreateBlockRequest {
            code: "B".to_string(), description: None, total_capacity: 50, annual_fee: 10000, status: "active".to_string(),
        }).unwrap();

        for i in 1..=5 {
            db.create_grave(&CreateGraveRequest {
                deceased_name: format!("Grave {}", i), block_id: block_a, number: format!("{:02}", i), date_of_death: "2024-01-01".to_string(),
                burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
                initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
            }).unwrap();
        }

        for i in 1..=3 {
            db.create_grave(&CreateGraveRequest {
                deceased_name: format!("Grave B{}", i), block_id: block_b, number: format!("{:02}", i), date_of_death: "2024-01-01".to_string(),
                burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
                initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
            }).unwrap();
        }

        let total = db.count_graves(None, None).unwrap();
        assert_eq!(total, 8);

        let block_a_count = db.count_graves(None, Some(block_a)).unwrap();
        assert_eq!(block_a_count, 5);

        cleanup_test_db(&temp_path);
    }

    // ==================== HEIRS CRUD TESTS ====================

    #[test]
    fn test_create_heir() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 10000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        let heir_id = db.create_heir(&CreateHeirRequest {
            grave_id,
            order_number: 1,
            full_name: "Ahli Waris 1".to_string(),
            phone_number: Some("08123456789".to_string()),
            relationship: Some("Anak".to_string()),
            address: Some("Jl. Contoh No. 1".to_string()),
            is_primary: true,
        }).unwrap();

        assert!(heir_id > 0);

        let heir = db.get_heir_by_id(heir_id).unwrap().expect("Heir should exist");
        assert_eq!(heir.full_name, "Ahli Waris 1");
        assert_eq!(heir.relationship, Some("Anak".to_string()));
        assert!(heir.is_primary);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_heirs_by_grave() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 10000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        for i in 1..=3 {
            db.create_heir(&CreateHeirRequest {
                grave_id,
                order_number: i,
                full_name: format!("Ahli Waris {}", i),
                phone_number: None,
                relationship: None,
                address: None,
                is_primary: i == 1,
            }).unwrap();
        }

        let heirs = db.get_heirs_by_grave(grave_id).unwrap();
        assert_eq!(heirs.len(), 3);
        assert_eq!(heirs[0].order_number, 1);
        assert_eq!(heirs[1].order_number, 2);
        assert_eq!(heirs[2].order_number, 3);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_heir_by_id_not_found() {
        let (db, temp_path) = create_test_db();

        let heir = db.get_heir_by_id(9999).unwrap();
        assert!(heir.is_none());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_update_heir() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 10000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        let heir_id = db.create_heir(&CreateHeirRequest {
            grave_id,
            order_number: 1,
            full_name: "Old Name".to_string(),
            phone_number: None,
            relationship: None,
            address: None,
            is_primary: true,
        }).unwrap();

        db.update_heir(heir_id, &UpdateHeirRequest {
            full_name: Some("Updated Name".to_string()),
            phone_number: Some("08987654321".to_string()),
            relationship: Some("Istri".to_string()),
            address: Some("Alamat Baru".to_string()),
            is_primary: Some(false),
        }).unwrap();

        let heir = db.get_heir_by_id(heir_id).unwrap().expect("Heir should exist");
        assert_eq!(heir.full_name, "Updated Name");
        assert_eq!(heir.relationship, Some("Istri".to_string()));
        assert!(!heir.is_primary);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_delete_heir() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 10000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        let heir_id = db.create_heir(&CreateHeirRequest {
            grave_id,
            order_number: 1,
            full_name: "To Delete".to_string(),
            phone_number: None,
            relationship: None,
            address: None,
            is_primary: true,
        }).unwrap();

        db.delete_heir(heir_id).unwrap();

        let heir = db.get_heir_by_id(heir_id).unwrap();
        assert!(heir.is_none());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_delete_heirs_by_grave() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 10000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        for i in 1..=3 {
            db.create_heir(&CreateHeirRequest {
                grave_id,
                order_number: i,
                full_name: format!("Heir {}", i),
                phone_number: None,
                relationship: None,
                address: None,
                is_primary: i == 1,
            }).unwrap();
        }

        db.delete_heirs_by_grave(grave_id).unwrap();

        let heirs = db.get_heirs_by_grave(grave_id).unwrap();
        assert!(heirs.is_empty());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_cascade_delete_heirs_on_grave_delete() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 10000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        db.create_heir(&CreateHeirRequest {
            grave_id, order_number: 1, full_name: "Heir 1".to_string(),
            phone_number: None, relationship: None, address: None, is_primary: true,
        }).unwrap();

        db.delete_grave(grave_id).unwrap();

        let heirs = db.get_heirs_by_grave(grave_id).unwrap();
        assert!(heirs.is_empty());

        cleanup_test_db(&temp_path);
    }

    // ==================== PAYMENTS CRUD TESTS ====================

    #[test]
    fn test_create_payment_success() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        let payment_id = db.create_payment(&CreatePaymentRequest {
            grave_id,
            year: 2025,
            payment_date: "2025-01-15".to_string(),
            amount: 100000,
            expected_fee: 0, // Will auto-fill from block's annual_fee
            payment_method: Some("cash".to_string()),
            payment_proof: None,
            paid_by: Some("Ahli Waris".to_string()),
            notes: None,
            inputted_by: None,
            received_by: None,
        }).unwrap();

        assert!(payment_id > 0);

        let payment = db.get_payment_by_id(payment_id).unwrap().expect("Payment should exist");
        assert_eq!(payment.year, 2025);
        assert_eq!(payment.amount, 100000);
        assert_eq!(payment.expected_fee, 100000); // auto-filled from block
        assert_eq!(payment.grave_id, grave_id);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_create_multi_payments() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        let ids = db.create_multi_payments(&[
            CreatePaymentRequest { grave_id, year: 2023, payment_date: "2023-06-01".to_string(), amount: 90000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None },
            CreatePaymentRequest { grave_id, year: 2024, payment_date: "2024-06-01".to_string(), amount: 95000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None },
            CreatePaymentRequest { grave_id, year: 2025, payment_date: "2025-06-01".to_string(), amount: 100000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None },
        ]).unwrap();

        assert_eq!(ids.len(), 3);

        let payments = db.get_payments_by_grave(grave_id).unwrap();
        assert_eq!(payments.len(), 3);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_payments_by_grave() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        // Create payments for 2023, 2024, 2025
        db.create_payment(&CreatePaymentRequest { grave_id, year: 2023, payment_date: "2023-06-01".to_string(), amount: 90000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None }).unwrap();
        db.create_payment(&CreatePaymentRequest { grave_id, year: 2024, payment_date: "2024-06-01".to_string(), amount: 95000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None }).unwrap();
        db.create_payment(&CreatePaymentRequest { grave_id, year: 2025, payment_date: "2025-06-01".to_string(), amount: 100000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None }).unwrap();

        let payments = db.get_payments_by_grave(grave_id).unwrap();
        assert_eq!(payments.len(), 3);
        assert_eq!(payments[0].year, 2025);
        assert_eq!(payments[2].year, 2023);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_payment_by_grave_and_year() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        db.create_payment(&CreatePaymentRequest { grave_id, year: 2025, payment_date: "2025-06-01".to_string(), amount: 100000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None }).unwrap();

        let payment = db.get_payment_by_grave_and_year(grave_id, 2025).unwrap();
        assert!(payment.is_some());
        assert_eq!(payment.unwrap().year, 2025);

        let no_payment = db.get_payment_by_grave_and_year(grave_id, 2026).unwrap();
        assert!(no_payment.is_none());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_payment_by_id_not_found() {
        let (db, temp_path) = create_test_db();

        let payment = db.get_payment_by_id(9999).unwrap();
        assert!(payment.is_none());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_delete_payment() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        let payment_id = db.create_payment(&CreatePaymentRequest { grave_id, year: 2025, payment_date: "2025-06-01".to_string(), amount: 100000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None }).unwrap();

        db.delete_payment(payment_id).unwrap();

        let payment = db.get_payment_by_id(payment_id).unwrap();
        assert!(payment.is_none());

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_duplicate_year_payment_fails() {
        let (db, temp_path) = create_test_db();

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        db.create_payment(&CreatePaymentRequest { grave_id, year: 2025, payment_date: "2025-01-01".to_string(), amount: 100000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None }).unwrap();

        let result = db.create_payment(&CreatePaymentRequest { grave_id, year: 2025, payment_date: "2025-06-01".to_string(), amount: 90000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None });

        assert!(result.is_err(), "Duplicate year payment should fail");
        assert!(result.unwrap_err().contains("UNIQUE"), "Error should mention UNIQUE constraint");

        cleanup_test_db(&temp_path);
    }

    // ==================== SETTINGS TESTS ====================

    #[test]
    fn test_get_settings_default() {
        let (db, temp_path) = create_test_db();

        let settings = db.get_settings().unwrap();
        assert_eq!(settings.foundation_name, "Yayasan Wakaf Makam Al-Ikhlas");
        assert!(settings.active_year > 0);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_update_settings() {
        let (db, temp_path) = create_test_db();

        db.update_settings(&UpdateSettingsRequest {
            foundation_name: Some("Yayasan Baru".to_string()),
            address: Some("Alamat Baru".to_string()),
            phone: Some("021123456".to_string()),
            email: Some("email@baru.com".to_string()),
            logo_path: None,
            active_year: Some(2030),
            auto_backup: Some(false),
        }).unwrap();

        let settings = db.get_settings().unwrap();
        assert_eq!(settings.foundation_name, "Yayasan Baru");
        assert_eq!(settings.address, Some("Alamat Baru".to_string()));
        assert_eq!(settings.phone, Some("021123456".to_string()));
        assert_eq!(settings.email, Some("email@baru.com".to_string()));
        assert_eq!(settings.active_year, 2030);
        assert!(!settings.auto_backup);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_update_last_backup() {
        let (db, temp_path) = create_test_db();

        let settings = db.get_settings().unwrap();
        assert!(settings.last_backup.is_none());

        db.update_last_backup().unwrap();

        let settings = db.get_settings().unwrap();
        assert!(settings.last_backup.is_some());

        cleanup_test_db(&temp_path);
    }

    // ==================== DASHBOARD TESTS ====================

    #[test]
    fn test_get_dashboard_stats() {
        let (db, temp_path) = create_test_db();

        // Empty DB dashboard
        let stats = db.get_dashboard_stats().unwrap();
        assert_eq!(stats.total_blocks, 0);
        assert_eq!(stats.total_graves, 0);
        assert_eq!(stats.total_heirs, 0);

        // Add data
        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 10, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        db.create_heir(&CreateHeirRequest {
            grave_id, order_number: 1, full_name: "Heir".to_string(),
            phone_number: None, relationship: None, address: None, is_primary: true,
        }).unwrap();

        let stats = db.get_dashboard_stats().unwrap();
        assert_eq!(stats.total_blocks, 1);
        assert_eq!(stats.total_graves, 1);
        assert_eq!(stats.total_heirs, 1);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_recent_payments() {
        let (db, temp_path) = create_test_db();

        let recent = db.get_recent_payments(5).unwrap();
        assert!(recent.is_empty());

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 10, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        db.create_payment(&CreatePaymentRequest { grave_id, year: 2025, payment_date: "2025-06-01".to_string(), amount: 100000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None }).unwrap();

        let recent = db.get_recent_payments(5).unwrap();
        assert_eq!(recent.len(), 1);
        assert_eq!(recent[0].deceased_name, "Almarhum");
        assert_eq!(recent[0].block_code, "A");

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_recent_graves() {
        let (db, temp_path) = create_test_db();

        let recent = db.get_recent_graves(5).unwrap();
        assert!(recent.is_empty());

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 10, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        let recent = db.get_recent_graves(5).unwrap();
        assert_eq!(recent.len(), 1);
        assert_eq!(recent[0].deceased_name, "Almarhum");

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_financial_summary() {
        let (db, temp_path) = create_test_db();

        let summary = db.get_financial_summary(2025).unwrap();
        assert_eq!(summary.total_revenue, 0);
        assert_eq!(summary.unpaid_count, 0);

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 10, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        db.create_payment(&CreatePaymentRequest { grave_id, year: 2025, payment_date: "2025-06-01".to_string(), amount: 100000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None }).unwrap();

        let summary = db.get_financial_summary(2025).unwrap();
        assert_eq!(summary.total_revenue, 100000);
        assert_eq!(summary.unpaid_count, 0);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_days_since_backup() {
        let (db, temp_path) = create_test_db();

        // No backup yet
        let days = db.get_days_since_backup().unwrap();
        assert_eq!(days, 999);

        cleanup_test_db(&temp_path);
    }

    // ==================== REPORTS TESTS ====================

    #[test]
    fn test_get_total_capacity() {
        let (db, temp_path) = create_test_db();

        let capacity = db.get_total_capacity().unwrap();
        assert_eq!(capacity, 0);

        db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 50, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        db.create_block(&CreateBlockRequest {
            code: "B".to_string(), description: None, total_capacity: 30, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let capacity = db.get_total_capacity().unwrap();
        assert_eq!(capacity, 80);

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_yearly_report() {
        let (db, temp_path) = create_test_db();

        // Empty report
        let report = db.get_yearly_report(2025).unwrap();
        assert_eq!(report.total_graves, 0);
        assert!(report.block_reports.is_empty());

        // Add data and check again
        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 10, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        db.create_payment(&CreatePaymentRequest { grave_id, year: 2025, payment_date: "2025-06-01".to_string(), amount: 100000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None }).unwrap();

        let report = db.get_yearly_report(2025).unwrap();
        assert_eq!(report.total_graves, 1);
        assert_eq!(report.total_paid, 1);
        assert_eq!(report.total_revenue, 100000);
        assert_eq!(report.block_reports.len(), 1);
        assert_eq!(report.block_reports[0].block_code, "A");

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_available_years() {
        let (db, temp_path) = create_test_db();

        let years = db.get_available_years().unwrap();
        // Should contain at least current year from settings
        assert!(!years.is_empty());

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 10, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        db.create_payment(&CreatePaymentRequest { grave_id, year: 2023, payment_date: "2023-06-01".to_string(), amount: 90000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None }).unwrap();
        db.create_payment(&CreatePaymentRequest { grave_id, year: 2025, payment_date: "2025-06-01".to_string(), amount: 100000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None }).unwrap();

        let years = db.get_available_years().unwrap();
        assert!(years.contains(&2023), "Should contain 2023 from payments");
        assert!(years.contains(&2025), "Should contain 2025 from payments");

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_grave_payment_detail() {
        let (db, temp_path) = create_test_db();

        let result = db.get_grave_payment_detail(9999).unwrap();
        assert!(result.is_none());

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 10, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        db.create_payment(&CreatePaymentRequest { grave_id, year: 2025, payment_date: "2025-06-01".to_string(), amount: 100000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None }).unwrap();

        let detail = db.get_grave_payment_detail(grave_id).unwrap();
        assert!(detail.is_some());
        let detail = detail.unwrap();
        assert_eq!(detail.deceased_name, "Almarhum");
        assert_eq!(detail.block_code, "A");

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_get_graves_payment_detail() {
        let (db, temp_path) = create_test_db();

        let details = db.get_graves_payment_detail(2025).unwrap();
        assert!(details.is_empty());

        let block_id = db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 10, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let grave_id = db.create_grave(&CreateGraveRequest {
            deceased_name: "Almarhum".to_string(), block_id, number: "01".to_string(), date_of_death: "2024-01-01".to_string(),
            burial_date: None, birth_place: None, birth_date: None, notes: None, grave_type: "new".to_string(),
            initial_fee_amount: 0, initial_fee_payment_date: None, initial_fee_payment_method: None, initial_fee_payment_proof: None,
        }).unwrap();

        db.create_payment(&CreatePaymentRequest { grave_id, year: 2025, payment_date: "2025-06-01".to_string(), amount: 100000, expected_fee: 0, payment_method: None, payment_proof: None, paid_by: None, notes: None, inputted_by: None, received_by: None }).unwrap();

        let details = db.get_graves_payment_detail(2025).unwrap();
        assert_eq!(details.len(), 1);
        assert_eq!(details[0].deceased_name, "Almarhum");

        cleanup_test_db(&temp_path);
    }

    // ==================== BACKUP / RESTORE TESTS ====================

    #[test]
    fn test_backup_database() {
        let (db, temp_path) = create_test_db();

        db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 10, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let backup_path = temp_path.parent().unwrap().join("test_backup.db");

        // Backup
        db.backup_to(backup_path.clone()).unwrap();
        assert!(backup_path.exists());

        // Cleanup backup
        if backup_path.exists() {
            std::fs::remove_file(&backup_path).unwrap();
        }

        cleanup_test_db(&temp_path);
    }

    #[test]
    fn test_restore_database() {
        let (db, temp_path) = create_test_db();

        db.create_block(&CreateBlockRequest {
            code: "A".to_string(), description: None, total_capacity: 10, annual_fee: 100000, status: "active".to_string(),
        }).unwrap();

        let backup_path = temp_path.parent().unwrap().join("test_restore.db");

        // Backup
        db.backup_to(backup_path.clone()).unwrap();

        // Create new db and restore
        let (mut restored_db, restored_path) = create_test_db();
        restored_db.restore_from(backup_path.clone()).unwrap();

        let blocks = restored_db.get_all_blocks().unwrap();
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].code, "A");

        // Cleanup
        if backup_path.exists() {
            std::fs::remove_file(&backup_path).unwrap();
        }
        cleanup_test_db(&restored_path);
        cleanup_test_db(&temp_path);
    }
}
