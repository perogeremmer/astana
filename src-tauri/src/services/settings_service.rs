use crate::db::Database;
use crate::models::*;

impl Database {
    pub fn get_settings(&self) -> Result<Settings, String> {
        let settings = self.conn.query_row(
            "SELECT id, foundation_name, address, phone, email, logo_path, active_year, last_backup, auto_backup, created_at, updated_at FROM settings WHERE id = 1",
            [], |row| Ok(Settings { id: row.get(0)?, foundation_name: row.get(1)?, address: row.get(2)?, phone: row.get(3)?, email: row.get(4)?, logo_path: row.get(5)?, active_year: row.get(6)?, last_backup: row.get(7)?, auto_backup: row.get::<_, i64>(8)? != 0, created_at: row.get(9)?, updated_at: row.get(10)? }),
        ).map_err(|e| format!("Failed to get settings: {}", e))?;
        Ok(settings)
    }

    pub fn update_settings(&self, settings: &UpdateSettingsRequest) -> Result<(), String> {
        self.conn.execute(
            "UPDATE settings SET foundation_name = COALESCE(?1, foundation_name), address = COALESCE(?2, address), phone = COALESCE(?3, phone), email = COALESCE(?4, email), logo_path = COALESCE(?5, logo_path), active_year = COALESCE(?6, active_year), auto_backup = COALESCE(?7, auto_backup) WHERE id = 1",
            [&settings.foundation_name, &settings.address, &settings.phone, &settings.email, &settings.logo_path, &settings.active_year.map(|y| y.to_string()), &settings.auto_backup.map(|b| if b { "1" } else { "0" }.to_string())],
        ).map_err(|e| format!("Failed to update settings: {}", e))?;
        Ok(())
    }

    pub fn update_last_backup(&self) -> Result<(), String> {
        self.conn.execute("UPDATE settings SET last_backup = CURRENT_TIMESTAMP WHERE id = 1", []).map_err(|e| format!("Failed to update last backup: {}", e))?;
        Ok(())
    }
}
