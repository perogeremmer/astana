use rusqlite::OptionalExtension;
use crate::db::Database;
use crate::models::*;

impl Database {
    pub fn get_heirs_by_grave(&self, grave_id: i64) -> Result<Vec<Heir>, String> {
        let mut stmt = self.conn
            .prepare("SELECT id, grave_id, order_number, full_name, phone_number, relationship, address, is_primary, created_at, updated_at FROM heirs WHERE grave_id = ?1 ORDER BY order_number")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let heirs = stmt
            .query_map([grave_id], |row| {
                Ok(Heir { id: row.get(0)?, grave_id: row.get(1)?, order_number: row.get(2)?, full_name: row.get(3)?, phone_number: row.get(4)?, relationship: row.get(5)?, address: row.get(6)?, is_primary: row.get(7)?, created_at: row.get(8)?, updated_at: row.get(9)? })
            })
            .map_err(|e| format!("Failed to query heirs: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect heirs: {}", e))?;
        Ok(heirs)
    }

    pub fn create_heir(&self, heir: &CreateHeirRequest) -> Result<i64, String> {
        self.conn.execute(
            "INSERT INTO heirs (grave_id, order_number, full_name, phone_number, relationship, address, is_primary) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            [&heir.grave_id as &dyn rusqlite::ToSql, &heir.order_number as &dyn rusqlite::ToSql, &heir.full_name as &dyn rusqlite::ToSql, &heir.phone_number.as_deref().unwrap_or("") as &dyn rusqlite::ToSql, &heir.relationship.as_deref().unwrap_or("") as &dyn rusqlite::ToSql, &heir.address.as_deref().unwrap_or("") as &dyn rusqlite::ToSql, &(if heir.is_primary { 1 } else { 0 }) as &dyn rusqlite::ToSql],
        ).map_err(|e| format!("Failed to create heir: {}", e))?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_heir_by_id(&self, id: i64) -> Result<Option<Heir>, String> {
        let heir = self.conn.query_row(
            "SELECT id, grave_id, order_number, full_name, phone_number, relationship, address, is_primary, created_at, updated_at FROM heirs WHERE id = ?1",
            [id],
            |row| Ok(Heir { id: row.get(0)?, grave_id: row.get(1)?, order_number: row.get(2)?, full_name: row.get(3)?, phone_number: row.get(4)?, relationship: row.get(5)?, address: row.get(6)?, is_primary: row.get(7)?, created_at: row.get(8)?, updated_at: row.get(9)? }),
        ).optional().map_err(|e| format!("Failed to get heir: {}", e))?;
        Ok(heir)
    }

    pub fn update_heir(&self, id: i64, heir: &UpdateHeirRequest) -> Result<(), String> {
        self.conn.execute(
            "UPDATE heirs SET full_name = COALESCE(?1, full_name), phone_number = COALESCE(?2, phone_number), relationship = COALESCE(?3, relationship), address = COALESCE(?4, address), is_primary = COALESCE(?5, is_primary) WHERE id = ?6",
            [&heir.full_name, &heir.phone_number, &heir.relationship, &heir.address, &heir.is_primary.map(|b| if b { "1" } else { "0" }.to_string()), &id as &dyn rusqlite::ToSql],
        ).map_err(|e| format!("Failed to update heir: {}", e))?;
        Ok(())
    }

    pub fn delete_heir(&self, id: i64) -> Result<(), String> {
        self.conn.execute("DELETE FROM heirs WHERE id = ?1", [id]).map_err(|e| format!("Failed to delete heir: {}", e))?;
        Ok(())
    }

    pub fn delete_heirs_by_grave(&self, grave_id: i64) -> Result<(), String> {
        self.conn.execute("DELETE FROM heirs WHERE grave_id = ?1", [grave_id]).map_err(|e| format!("Failed to delete heirs: {}", e))?;
        Ok(())
    }
}
