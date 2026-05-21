use rusqlite::OptionalExtension;
use rand::Rng;

use crate::db::Database;
use crate::models::*;

impl Database {
    pub fn generate_random_password() -> String {
        const CHARSET: &str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let mut rng = rand::thread_rng();
        (0..12).map(|_| { let idx = rng.gen_range(0..CHARSET.len()); CHARSET.chars().nth(idx).unwrap() }).collect()
    }

    pub fn hash_password(password: &str) -> Result<String, String> {
        use argon2::{password_hash::{rand_core::OsRng, PasswordHasher, SaltString}, Argon2};
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2.hash_password(password.as_bytes(), &salt).map_err(|e| format!("Failed to hash password: {}", e))?.to_string();
        Ok(password_hash)
    }

    pub fn verify_password(password: &str, hash: &str) -> Result<bool, String> {
        use argon2::{PasswordHash, PasswordVerifier, Argon2};
        let parsed_hash = PasswordHash::new(hash).map_err(|e| format!("Failed to parse password hash: {}", e))?;
        Ok(Argon2::default().verify_password(password.as_bytes(), &parsed_hash).is_ok())
    }

    pub fn is_users_empty(&self) -> Result<bool, String> {
        let count: i64 = self.conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0)).unwrap_or(0);
        Ok(count == 0)
    }

    pub fn create_superadmin_0(&self, password: &str) -> Result<User, String> {
        let password_hash = Self::hash_password(password)?;
        self.conn.execute("INSERT INTO users (username, password_hash, role, is_active, is_password_changed) VALUES ('superadmin', ?1, 'superadmin_0', 1, 0)", [&password_hash])
            .map_err(|e| format!("Failed to create superadmin: {}", e))?;
        self.get_user_by_username("superadmin")?.ok_or_else(|| "Failed to retrieve created user".to_string())
    }

    pub fn get_user_by_id(&self, id: i64) -> Result<Option<User>, String> {
        let user = self.conn.query_row("SELECT id, username, full_name, role, is_active, is_password_changed, created_by, created_at, updated_at FROM users WHERE id = ?1", [id], |row| {
            Ok(User { id: row.get(0)?, username: row.get(1)?, full_name: row.get(2)?, role: row.get(3)?, is_active: row.get(4)?, is_password_changed: row.get(5)?, created_by: row.get(6)?, created_at: row.get(7)?, updated_at: row.get(8)? })
        }).optional().map_err(|e| format!("Failed to get user: {}", e))?;
        Ok(user)
    }

    pub fn get_user_by_username(&self, username: &str) -> Result<Option<User>, String> {
        let user = self.conn.query_row("SELECT id, username, full_name, role, is_active, is_password_changed, created_by, created_at, updated_at FROM users WHERE LOWER(username) = LOWER(?1)", [username], |row| {
            Ok(User { id: row.get(0)?, username: row.get(1)?, full_name: row.get(2)?, role: row.get(3)?, is_active: row.get(4)?, is_password_changed: row.get(5)?, created_by: row.get(6)?, created_at: row.get(7)?, updated_at: row.get(8)? })
        }).optional().map_err(|e| format!("Failed to get user: {}", e))?;
        Ok(user)
    }

    pub(crate) fn get_user_by_username_with_hash(&self, username: &str) -> Result<Option<UserWithHash>, String> {
        let user = self.conn.query_row("SELECT id, username, password_hash, full_name, role, is_active, is_password_changed, created_by, created_at, updated_at FROM users WHERE LOWER(username) = LOWER(?1)", [username], |row| {
            Ok(UserWithHash { id: row.get(0)?, username: row.get(1)?, password_hash: row.get(2)?, full_name: row.get(3)?, role: row.get(4)?, is_active: row.get(5)?, is_password_changed: row.get(6)?, created_by: row.get(7)?, created_at: row.get(8)?, updated_at: row.get(9)? })
        }).optional().map_err(|e| format!("Failed to get user: {}", e))?;
        Ok(user)
    }

    pub fn login(&self, username: &str, password: &str) -> Result<LoginResult, String> {
        let user_with_hash = self.get_user_by_username_with_hash(username)?;
        match user_with_hash {
            Some(u) => {
                if !u.is_active { return Ok(LoginResult { success: false, user: None, message: "Akun tidak aktif. Hubungi administrator.".to_string(), must_change_password: false }); }
                let is_valid = Self::verify_password(password, &u.password_hash)?;
                if is_valid {
                    let user = User { id: u.id, username: u.username, full_name: u.full_name, role: u.role, is_active: u.is_active, is_password_changed: u.is_password_changed, created_by: u.created_by, created_at: u.created_at, updated_at: u.updated_at };
                    Ok(LoginResult { success: true, user: Some(user), message: "Login berhasil".to_string(), must_change_password: !u.is_password_changed })
                } else { Ok(LoginResult { success: false, user: None, message: "Username atau password salah".to_string(), must_change_password: false }) }
            }
            None => Ok(LoginResult { success: false, user: None, message: "Username atau password salah".to_string(), must_change_password: false }),
        }
    }

    pub fn logout(&self, user_id: i64) -> Result<(), String> {
        self.conn.execute("UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?1", [user_id]).map_err(|e| format!("Failed to update user: {}", e))?;
        Ok(())
    }

    pub fn change_password(&self, user_id: i64, old_password: Option<&str>, new_password: &str, is_first_change: bool) -> Result<Result<(), String>, String> {
        let user = self.conn.query_row("SELECT id, password_hash, is_password_changed FROM users WHERE id = ?1", [user_id], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, bool>(2)?)))
            .map_err(|e| format!("Failed to get user: {}", e))?;
        let (_, password_hash, _) = user;
        if is_first_change || (old_password.is_some() && Self::verify_password(old_password.unwrap(), &password_hash)?) {
            let new_hash = Self::hash_password(new_password)?;
            self.conn.execute("UPDATE users SET password_hash = ?1, is_password_changed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", [&new_hash as &dyn rusqlite::ToSql, &user_id as &dyn rusqlite::ToSql])
                .map_err(|e| format!("Failed to update password: {}", e))?;
            Ok(Ok(()))
        } else { Ok(Err("Password lama salah".to_string())) }
    }

    pub fn get_all_users(&self) -> Result<Vec<User>, String> {
        let mut stmt = self.conn.prepare("SELECT id, username, full_name, role, is_active, is_password_changed, created_by, created_at, updated_at FROM users ORDER BY id").map_err(|e| format!("Failed to prepare query: {}", e))?;
        let users = stmt.query_map([], |row| Ok(User { id: row.get(0)?, username: row.get(1)?, full_name: row.get(2)?, role: row.get(3)?, is_active: row.get(4)?, is_password_changed: row.get(5)?, created_by: row.get(6)?, created_at: row.get(7)?, updated_at: row.get(8)? }))
            .map_err(|e| format!("Failed to query users: {}", e))?.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to collect users: {}", e))?;
        Ok(users)
    }

    pub fn create_user(&self, request: &CreateUserRequest, created_by: i64) -> Result<i64, String> {
        if request.username.trim().is_empty() { return Err("Username tidak boleh kosong".to_string()); }
        if request.username.len() < 3 { return Err("Username minimal 3 karakter".to_string()); }
        if !["admin", "superadmin", "superadmin_0"].contains(&request.role.as_str()) { return Err("Role tidak valid".to_string()); }
        if let Some(_) = self.get_user_by_username(&request.username)? { return Err("Username sudah ada".to_string()); }
        if request.password.len() < 6 { return Err("Password minimal 6 karakter".to_string()); }
        let password_hash = Self::hash_password(&request.password)?;
        self.conn.execute("INSERT INTO users (username, password_hash, full_name, role, is_active, created_by) VALUES (?1, ?2, ?3, ?4, 1, ?5)",
            rusqlite::params![request.username, password_hash, request.full_name, request.role, created_by]).map_err(|e| format!("Failed to create user: {}", e))?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn update_user(&self, user_id: i64, request: &UpdateUserRequest, updated_by: i64) -> Result<(), String> {
        let target = self.get_user_by_id(user_id)?;
        if target.is_none() { return Err("User tidak ditemukan".to_string()); }
        let target = target.unwrap();
        if target.role == "superadmin_0" && request.is_active == Some(false) { return Err("Superadmin_0 tidak dapat dinonaktifkan".to_string()); }
        let deleter = self.get_user_by_id(updated_by)?;
        if deleter.is_none() { return Err("Anda tidak memiliki akses".to_string()); }
        self.conn.execute("UPDATE users SET full_name = COALESCE(?1, full_name), role = COALESCE(?2, role), is_active = COALESCE(?3, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = ?4",
            rusqlite::params![request.full_name, request.role, request.is_active, user_id]).map_err(|e| format!("Failed to update user: {}", e))?;
        Ok(())
    }

    pub fn delete_user(&self, user_id: i64, deleted_by: i64) -> Result<Result<(), String>, String> {
        let user = self.get_user_by_id(user_id)?;
        if let Some(ref u) = user {
            if u.role == "superadmin_0" { return Ok(Err("Superadmin_0 tidak dapat dihapus".to_string())); }
            if u.id == deleted_by { return Ok(Err("Anda tidak dapat menghapus akun sendiri".to_string())); }
        } else { return Ok(Err("User tidak ditemukan".to_string())); }
        let user = user.unwrap();
        self.conn.execute("DELETE FROM users WHERE id = ?1", [user_id]).map_err(|e| format!("Failed to delete user: {}", e))?;
        let deleter = self.get_user_by_id(deleted_by)?;
        self.log_audit(Some(deleted_by), deleter.as_ref().map(|u| u.username.as_str()), "DELETE", "user", Some(user_id), Some(&serde_json::to_string(&user).unwrap_or_default()), None, Some(format!("Deleted user '{}' (ID: {})", user.username, user_id).as_str()))?;
        Ok(Ok(()))
    }

    pub fn reset_user_password(&self, user_id: i64, new_password: &str, reset_by: i64) -> Result<String, String> {
        let user = self.get_user_by_id(user_id)?;
        if user.is_none() { return Err("User tidak ditemukan".to_string()); }
        let user = user.unwrap();
        let new_hash = Self::hash_password(new_password)?;
        self.conn.execute("UPDATE users SET password_hash = ?1, is_password_changed = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", [&new_hash as &dyn rusqlite::ToSql, &user_id as &dyn rusqlite::ToSql]).map_err(|e| format!("Failed to reset password: {}", e))?;
        let resetter = self.get_user_by_id(reset_by)?;
        self.log_audit(Some(reset_by), resetter.as_ref().map(|u| u.username.as_str()), "RESET_PASSWORD", "user", Some(user_id), None, None, Some(format!("Password reset for user '{}' (ID: {})", user.username, user_id).as_str()))?;
        Ok(new_password.to_string())
    }
}
