use rusqlite::OptionalExtension;

use crate::db::Database;
use crate::models::*;

impl Database {
    pub fn get_all_blocks(&self) -> Result<Vec<Block>, String> {
        let mut stmt = self.conn
            .prepare("SELECT id, code, description, total_capacity, annual_fee, status, created_at, updated_at FROM blocks ORDER BY code")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let blocks = stmt
            .query_map([], |row| {
                Ok(Block {
                    id: row.get(0)?, code: row.get(1)?, description: row.get(2)?,
                    total_capacity: row.get(3)?, annual_fee: row.get(4)?, status: row.get(5)?,
                    created_at: row.get(6)?, updated_at: row.get(7)?,
                })
            })
            .map_err(|e| format!("Failed to query blocks: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect blocks: {}", e))?;
        Ok(blocks)
    }

    pub fn get_block_by_id(&self, id: i64) -> Result<Option<Block>, String> {
        let block = self.conn
            .query_row(
                "SELECT id, code, description, total_capacity, annual_fee, status, created_at, updated_at FROM blocks WHERE id = ?1",
                [id],
                |row| {
                    Ok(Block {
                        id: row.get(0)?, code: row.get(1)?, description: row.get(2)?,
                        total_capacity: row.get(3)?, annual_fee: row.get(4)?, status: row.get(5)?,
                        created_at: row.get(6)?, updated_at: row.get(7)?,
                    })
                },
            )
            .optional()
            .map_err(|e| format!("Failed to get block: {}", e))?;
        Ok(block)
    }

    pub fn create_block(&self, block: &CreateBlockRequest) -> Result<i64, String> {
        self.conn
            .execute(
                "INSERT INTO blocks (code, description, total_capacity, annual_fee, status) VALUES (?1, ?2, ?3, ?4, ?5)",
                [
                    &block.code as &dyn rusqlite::ToSql,
                    &block.description.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                    &block.total_capacity as &dyn rusqlite::ToSql,
                    &block.annual_fee as &dyn rusqlite::ToSql,
                    &block.status as &dyn rusqlite::ToSql,
                ],
            )
            .map_err(|e| format!("Failed to create block: {}", e))?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn update_block(&self, id: i64, block: &UpdateBlockRequest) -> Result<(), String> {
        self.conn
            .execute(
                "UPDATE blocks SET code = COALESCE(?1, code), description = COALESCE(?2, description), total_capacity = COALESCE(?3, total_capacity), annual_fee = COALESCE(?4, annual_fee), status = COALESCE(?5, status) WHERE id = ?6",
                [
                    &block.code as &dyn rusqlite::ToSql,
                    &block.description as &dyn rusqlite::ToSql,
                    &block.total_capacity as &dyn rusqlite::ToSql,
                    &block.annual_fee as &dyn rusqlite::ToSql,
                    &block.status as &dyn rusqlite::ToSql,
                    &id as &dyn rusqlite::ToSql,
                ],
            )
            .map_err(|e| format!("Failed to update block: {}", e))?;
        Ok(())
    }

    pub fn delete_block(&self, id: i64) -> Result<(), String> {
        let grave_count: i64 = self.conn
            .query_row("SELECT COUNT(*) FROM graves WHERE block_id = ?1", [id], |row| row.get(0))
            .map_err(|e| format!("Failed to check graves: {}", e))?;
        if grave_count > 0 {
            return Err(format!("Cannot delete block: {} grave(s) still associated", grave_count));
        }
        self.conn.execute("DELETE FROM blocks WHERE id = ?1", [id])
            .map_err(|e| format!("Failed to delete block: {}", e))?;
        Ok(())
    }

    pub fn get_block_stats(&self, block_id: i64) -> Result<BlockStats, String> {
        let total_capacity: i64 = self.conn
            .query_row("SELECT total_capacity FROM blocks WHERE id = ?1", [block_id], |row| row.get(0))
            .map_err(|e| format!("Failed to get block capacity: {}", e))?;
        let occupied: i64 = self.conn
            .query_row("SELECT COUNT(*) FROM graves WHERE block_id = ?1", [block_id], |row| row.get(0))
            .map_err(|e| format!("Failed to count graves: {}", e))?;
        Ok(BlockStats { total_capacity, occupied, available: total_capacity - occupied })
    }
}
