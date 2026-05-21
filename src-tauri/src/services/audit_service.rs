use crate::db::Database;
use crate::models::*;

impl Database {
    pub fn log_audit(&self, user_id: Option<i64>, username: Option<&str>, action: &str, entity_type: &str, entity_id: Option<i64>, old_data: Option<&str>, new_data: Option<&str>, details: Option<&str>) -> Result<(), String> {
        self.conn.execute(
            "INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, old_data, new_data, details) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![user_id, username, action, entity_type, entity_id, old_data, new_data, details],
        ).map_err(|e| format!("Failed to log audit: {}", e))?;
        Ok(())
    }

    pub fn get_audit_logs(&self, limit: i64, offset: i64) -> Result<Vec<AuditLog>, String> {
        let mut stmt = self.conn.prepare("SELECT id, user_id, username, action, entity_type, entity_id, old_data, new_data, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?1 OFFSET ?2")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let logs = stmt.query_map([limit, offset], |row| Ok(AuditLog { id: row.get(0)?, user_id: row.get(1)?, username: row.get(2)?, action: row.get(3)?, entity_type: row.get(4)?, entity_id: row.get(5)?, old_data: row.get(6)?, new_data: row.get(7)?, details: row.get(8)?, created_at: row.get(9)? }))
            .map_err(|e| format!("Failed to query audit logs: {}", e))?.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to collect audit logs: {}", e))?;
        Ok(logs)
    }

    pub fn count_audit_logs(&self) -> Result<i64, String> {
        let count: i64 = self.conn.query_row("SELECT COUNT(*) FROM audit_logs", [], |row| row.get(0)).map_err(|e| format!("Failed to count audit logs: {}", e))?;
        Ok(count)
    }
}
