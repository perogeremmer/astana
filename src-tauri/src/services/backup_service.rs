use std::path::PathBuf;
use rusqlite::Connection;

use crate::db::Database;

impl Database {
    pub fn backup_to(&self, backup_path: PathBuf) -> Result<(), String> {
        let mut dst = Connection::open(backup_path)
            .map_err(|e| format!("Failed to create backup file: {}", e))?;
        let backup = rusqlite::backup::Backup::new(&self.conn, &mut dst)
            .map_err(|e| format!("Failed to initialize backup: {}", e))?;
        backup.step(-1)
            .map_err(|e| format!("Failed to perform backup: {}", e))?;
        Ok(())
    }

    pub fn restore_from(&mut self, backup_path: PathBuf) -> Result<(), String> {
        let src = Connection::open(&backup_path)
            .map_err(|e| format!("Failed to open backup file: {}", e))?;
        let backup = rusqlite::backup::Backup::new(&src, &mut self.conn)
            .map_err(|e| format!("Failed to initialize restore: {}", e))?;
        backup.step(-1)
            .map_err(|e| format!("Failed to perform restore: {}", e))?;
        Ok(())
    }
}
