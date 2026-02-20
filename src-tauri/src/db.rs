//! Database module for Astana - Grave Management System
//! 
//! This module handles SQLite database initialization and connection.
//! Database is created automatically when the app runs for the first time.

use std::fs;
use std::path::PathBuf;
use rusqlite::{Connection, OptionalExtension};

use tauri::AppHandle;
use tauri::Manager;

/// Database file name
const DB_FILENAME: &str = "astana.db";

/// Embedded SQL migration script
const MIGRATION_SQL: &str = include_str!("../migrations/001_initial.sql");

/// Database management structure
pub struct Database {
    conn: Connection,
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
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;
        
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
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;
        
        let db = Self { conn };
        db.run_migrations()?;
        
        log::info!("Database successfully initialized at: {:?}", db_path);
        Ok(db)
    }
    
    /// Get database path based on platform
    /// 
    /// Windows: %LOCALAPPDATA%/com.perogeremmer.astana/astana.db
    /// macOS: ~/Library/Application Support/com.perogeremmer.astana/astana.db
    /// Linux: ~/.local/share/com.perogeremmer.astana/astana.db
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
        self.conn
            .execute_batch(MIGRATION_SQL)
            .map_err(|e| format!("Failed to run migrations: {}", e))?;
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
        // Check main tables
        let tables = vec!["blocks", "graves", "heirs", "payments", "settings"];
        
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
            .query_row("SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()", [], |row| row.get(0))
            .unwrap_or(0);
        
        Ok(DatabaseStats {
            graves_count,
            heirs_count,
            payments_count,
            size_bytes: page_count,
        })
    }
    
    /// Backup database to specific path
    pub fn backup_to(&self, backup_path: PathBuf) -> Result<(), String> {
        // Use SQLite backup API
        let mut dst = Connection::open(backup_path)
            .map_err(|e| format!("Failed to create backup file: {}", e))?;
        
        let backup = rusqlite::backup::Backup::new(&self.conn, &mut dst)
            .map_err(|e| format!("Failed to initialize backup: {}", e))?;
        
        backup
            .step(-1)
            .map_err(|e| format!("Failed to perform backup: {}", e))?;
        
        Ok(())
    }
    
    // ==================== BLOCKS CRUD ====================
    
    /// Get all blocks
    pub fn get_all_blocks(&self) -> Result<Vec<Block>, String> {
        let mut stmt = self.conn
            .prepare("SELECT id, code, description, total_capacity, annual_fee, status, created_at, updated_at FROM blocks ORDER BY code")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        
        let blocks = stmt
            .query_map([], |row| {
                Ok(Block {
                    id: row.get(0)?,
                    code: row.get(1)?,
                    description: row.get(2)?,
                    total_capacity: row.get(3)?,
                    annual_fee: row.get(4)?,
                    status: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })
            .map_err(|e| format!("Failed to query blocks: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect blocks: {}", e))?;
        
        Ok(blocks)
    }
    
    /// Get block by ID
    pub fn get_block_by_id(&self, id: i64) -> Result<Option<Block>, String> {
        let block = self.conn
            .query_row(
                "SELECT id, code, description, total_capacity, annual_fee, status, created_at, updated_at FROM blocks WHERE id = ?1",
                [id],
                |row| {
                    Ok(Block {
                        id: row.get(0)?,
                        code: row.get(1)?,
                        description: row.get(2)?,
                        total_capacity: row.get(3)?,
                        annual_fee: row.get(4)?,
                        status: row.get(5)?,
                        created_at: row.get(6)?,
                        updated_at: row.get(7)?,
                    })
                },
            )
            .optional()
            .map_err(|e| format!("Failed to get block: {}", e))?;
        
        Ok(block)
    }
    
    /// Create new block
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
    
    /// Update block
    pub fn update_block(&self, id: i64, block: &UpdateBlockRequest) -> Result<(), String> {
        self.conn
            .execute(
                "UPDATE blocks SET 
                    code = COALESCE(?1, code),
                    description = COALESCE(?2, description),
                    total_capacity = COALESCE(?3, total_capacity),
                    annual_fee = COALESCE(?4, annual_fee),
                    status = COALESCE(?5, status)
                    WHERE id = ?6",
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
    
    /// Delete block
    pub fn delete_block(&self, id: i64) -> Result<(), String> {
        // Check if block has graves
        let grave_count: i64 = self.conn
            .query_row(
                "SELECT COUNT(*) FROM graves WHERE block_id = ?1",
                [id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check graves: {}", e))?;
        
        if grave_count > 0 {
            return Err(format!("Cannot delete block: {} grave(s) still associated", grave_count));
        }
        
        self.conn
            .execute("DELETE FROM blocks WHERE id = ?1", [id])
            .map_err(|e| format!("Failed to delete block: {}", e))?;
        
        Ok(())
    }
    
    /// Get block stats (occupied count)
    pub fn get_block_stats(&self, block_id: i64) -> Result<BlockStats, String> {
        let total_capacity: i64 = self.conn
            .query_row(
                "SELECT total_capacity FROM blocks WHERE id = ?1",
                [block_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to get block capacity: {}", e))?;
        
        let occupied: i64 = self.conn
            .query_row(
                "SELECT COUNT(*) FROM graves WHERE block_id = ?1",
                [block_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to count graves: {}", e))?;
        
        Ok(BlockStats {
            total_capacity,
            occupied,
            available: total_capacity - occupied,
        })
    }
    
    // ==================== GRAVES CRUD ====================
    
    /// Get graves with pagination and search
    pub fn get_graves(&self, search: Option<String>, block_id: Option<i64>, limit: i64, offset: i64) -> Result<Vec<GraveWithBlock>, String> {
        let mut query = String::from(
            "SELECT g.id, g.deceased_name, g.block_id, g.number, g.date_of_death, g.burial_date, g.notes, g.created_at, g.updated_at,
                    b.code, b.annual_fee
                    FROM graves g
                    JOIN blocks b ON g.block_id = b.id
                    WHERE 1=1"
        );
        
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        
        if let Some(s) = search {
            query.push_str(" AND (g.deceased_name LIKE ? OR g.number LIKE ?)");
            let pattern = format!("%{}%", s);
            params.push(Box::new(pattern.clone()));
            params.push(Box::new(pattern));
        }
        
        if let Some(bid) = block_id {
            query.push_str(" AND g.block_id = ?");
            params.push(Box::new(bid));
        }
        
        query.push_str(" ORDER BY g.created_at DESC LIMIT ? OFFSET ?");
        params.push(Box::new(limit));
        params.push(Box::new(offset));
        
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        
        let mut stmt = self.conn
            .prepare(&query)
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        
        let graves = stmt
            .query_map(param_refs.as_slice(), |row| {
                Ok(GraveWithBlock {
                    id: row.get(0)?,
                    deceased_name: row.get(1)?,
                    block_id: row.get(2)?,
                    number: row.get(3)?,
                    date_of_death: row.get(4)?,
                    burial_date: row.get(5)?,
                    notes: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                    code: row.get(9)?,
                    annual_fee: row.get(10)?,
                })
            })
            .map_err(|e| format!("Failed to query graves: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect graves: {}", e))?;
        
        Ok(graves)
    }
    
    /// Create new grave
    pub fn create_grave(&self, grave: &CreateGraveRequest) -> Result<i64, String> {
        self.conn
            .execute(
                "INSERT INTO graves (deceased_name, block_id, number, date_of_death, burial_date, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                [
                    &grave.deceased_name as &dyn rusqlite::ToSql,
                    &grave.block_id as &dyn rusqlite::ToSql,
                    &grave.number as &dyn rusqlite::ToSql,
                    &grave.date_of_death as &dyn rusqlite::ToSql,
                    &grave.burial_date.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                    &grave.notes.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                ],
            )
            .map_err(|e| format!("Failed to create grave: {}", e))?;
        
        Ok(self.conn.last_insert_rowid())
    }
    
    /// Get grave by ID
    pub fn get_grave_by_id(&self, id: i64) -> Result<Option<GraveWithBlock>, String> {
        let grave = self.conn
            .query_row(
                "SELECT g.id, g.deceased_name, g.block_id, g.number, g.date_of_death, g.burial_date, g.notes, g.created_at, g.updated_at,
                        b.code, b.annual_fee
                 FROM graves g
                 JOIN blocks b ON g.block_id = b.id
                 WHERE g.id = ?1",
                [id],
                |row| {
                    Ok(GraveWithBlock {
                        id: row.get(0)?,
                        deceased_name: row.get(1)?,
                        block_id: row.get(2)?,
                        number: row.get(3)?,
                        date_of_death: row.get(4)?,
                        burial_date: row.get(5)?,
                        notes: row.get(6)?,
                        created_at: row.get(7)?,
                        updated_at: row.get(8)?,
                        code: row.get(9)?,
                        annual_fee: row.get(10)?,
                    })
                },
            )
            .optional()
            .map_err(|e| format!("Failed to get grave: {}", e))?;
        
        Ok(grave)
    }
    
    /// Update grave
    pub fn update_grave(&self, id: i64, grave: &UpdateGraveRequest) -> Result<(), String> {
        self.conn
            .execute(
                "UPDATE graves SET 
                    deceased_name = COALESCE(?1, deceased_name),
                    block_id = COALESCE(?2, block_id),
                    number = COALESCE(?3, number),
                    date_of_death = COALESCE(?4, date_of_death),
                    burial_date = COALESCE(?5, burial_date),
                    notes = COALESCE(?6, notes)
                 WHERE id = ?7",
                [
                    &grave.deceased_name as &dyn rusqlite::ToSql,
                    &grave.block_id.map(|v| v.to_string()) as &dyn rusqlite::ToSql,
                    &grave.number as &dyn rusqlite::ToSql,
                    &grave.date_of_death as &dyn rusqlite::ToSql,
                    &grave.burial_date as &dyn rusqlite::ToSql,
                    &grave.notes as &dyn rusqlite::ToSql,
                    &id as &dyn rusqlite::ToSql,
                ],
            )
            .map_err(|e| format!("Failed to update grave: {}", e))?;
        
        Ok(())
    }
    
    /// Delete grave (will cascade delete heirs and payments)
    pub fn delete_grave(&self, id: i64) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM graves WHERE id = ?1", [id])
            .map_err(|e| format!("Failed to delete grave: {}", e))?;
        
        Ok(())
    }
    
    /// Count graves for pagination
    pub fn count_graves(&self, search: Option<String>, block_id: Option<i64>) -> Result<i64, String> {
        let mut query = String::from(
            "SELECT COUNT(*) FROM graves g WHERE 1=1"
        );
        
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        
        if let Some(s) = search {
            query.push_str(" AND (g.deceased_name LIKE ? OR g.number LIKE ?)");
            let pattern = format!("%{}%", s);
            params.push(Box::new(pattern.clone()));
            params.push(Box::new(pattern));
        }
        
        if let Some(bid) = block_id {
            query.push_str(" AND g.block_id = ?");
            params.push(Box::new(bid));
        }
        
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        
        let count: i64 = self.conn
            .query_row(&query, param_refs.as_slice(), |row| row.get(0))
            .map_err(|e| format!("Failed to count graves: {}", e))?;
        
        Ok(count)
    }
    
    // ==================== HEIRS CRUD ====================
    
    /// Get heirs by grave ID
    pub fn get_heirs_by_grave(&self, grave_id: i64) -> Result<Vec<Heir>, String> {
        let mut stmt = self.conn
            .prepare("SELECT id, grave_id, order_number, full_name, phone_number, relationship, address, is_primary, created_at, updated_at FROM heirs WHERE grave_id = ?1 ORDER BY order_number")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        
        let heirs = stmt
            .query_map([grave_id], |row| {
                Ok(Heir {
                    id: row.get(0)?,
                    grave_id: row.get(1)?,
                    order_number: row.get(2)?,
                    full_name: row.get(3)?,
                    phone_number: row.get(4)?,
                    relationship: row.get(5)?,
                    address: row.get(6)?,
                    is_primary: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            })
            .map_err(|e| format!("Failed to query heirs: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect heirs: {}", e))?;
        
        Ok(heirs)
    }
    
    /// Create new heir
    pub fn create_heir(&self, heir: &CreateHeirRequest) -> Result<i64, String> {
        self.conn
            .execute(
                "INSERT INTO heirs (grave_id, order_number, full_name, phone_number, relationship, address, is_primary) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                [
                    &heir.grave_id as &dyn rusqlite::ToSql,
                    &heir.order_number as &dyn rusqlite::ToSql,
                    &heir.full_name as &dyn rusqlite::ToSql,
                    &heir.phone_number.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                    &heir.relationship.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                    &heir.address.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                    &(if heir.is_primary { 1 } else { 0 }) as &dyn rusqlite::ToSql,
                ],
            )
            .map_err(|e| format!("Failed to create heir: {}", e))?;
        
        Ok(self.conn.last_insert_rowid())
    }
    
    /// Get heir by ID
    pub fn get_heir_by_id(&self, id: i64) -> Result<Option<Heir>, String> {
        let heir = self.conn
            .query_row(
                "SELECT id, grave_id, order_number, full_name, phone_number, relationship, address, is_primary, created_at, updated_at 
                 FROM heirs WHERE id = ?1",
                [id],
                |row| {
                    Ok(Heir {
                        id: row.get(0)?,
                        grave_id: row.get(1)?,
                        order_number: row.get(2)?,
                        full_name: row.get(3)?,
                        phone_number: row.get(4)?,
                        relationship: row.get(5)?,
                        address: row.get(6)?,
                        is_primary: row.get(7)?,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                    })
                },
            )
            .optional()
            .map_err(|e| format!("Failed to get heir: {}", e))?;
        
        Ok(heir)
    }
    
    /// Update heir
    pub fn update_heir(&self, id: i64, heir: &UpdateHeirRequest) -> Result<(), String> {
        self.conn
            .execute(
                "UPDATE heirs SET 
                    full_name = COALESCE(?1, full_name),
                    phone_number = COALESCE(?2, phone_number),
                    relationship = COALESCE(?3, relationship),
                    address = COALESCE(?4, address),
                    is_primary = COALESCE(?5, is_primary)
                 WHERE id = ?6",
                [
                    &heir.full_name,
                    &heir.phone_number,
                    &heir.relationship,
                    &heir.address,
                    &heir.is_primary.map(|b| if b { "1" } else { "0" }.to_string()),
                    &id as &dyn rusqlite::ToSql,
                ],
            )
            .map_err(|e| format!("Failed to update heir: {}", e))?;
        
        Ok(())
    }
    
    /// Delete heir
    pub fn delete_heir(&self, id: i64) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM heirs WHERE id = ?1", [id])
            .map_err(|e| format!("Failed to delete heir: {}", e))?;
        
        Ok(())
    }
    
    /// Delete all heirs by grave ID (for bulk update)
    pub fn delete_heirs_by_grave(&self, grave_id: i64) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM heirs WHERE grave_id = ?1", [grave_id])
            .map_err(|e| format!("Failed to delete heirs: {}", e))?;
        
        Ok(())
    }
    
    // ==================== PAYMENTS CRUD ====================
    
    /// Get payments by grave ID
    pub fn get_payments_by_grave(&self, grave_id: i64) -> Result<Vec<Payment>, String> {
        let mut stmt = self.conn
            .prepare("SELECT id, grave_id, year, payment_date, amount, payment_method, payment_proof, paid_by, notes, created_at, updated_at FROM payments WHERE grave_id = ?1 ORDER BY year DESC")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        
        let payments = stmt
            .query_map([grave_id], |row| {
                Ok(Payment {
                    id: row.get(0)?,
                    grave_id: row.get(1)?,
                    year: row.get(2)?,
                    payment_date: row.get(3)?,
                    amount: row.get(4)?,
                    payment_method: row.get(5)?,
                    payment_proof: row.get(6)?,
                    paid_by: row.get(7)?,
                    notes: row.get(8)?,
                    created_at: row.get(9)?,
                    updated_at: row.get(10)?,
                })
            })
            .map_err(|e| format!("Failed to query payments: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect payments: {}", e))?;
        
        Ok(payments)
    }
    
    /// Check if payment exists for grave and year
    pub fn get_payment_by_grave_and_year(&self, grave_id: i64, year: i32) -> Result<Option<Payment>, String> {
        let payment = self.conn
            .query_row(
                "SELECT id, grave_id, year, payment_date, amount, payment_method, payment_proof, paid_by, notes, created_at, updated_at FROM payments WHERE grave_id = ?1 AND year = ?2",
                [grave_id.to_string(), year.to_string()],
                |row| {
                    Ok(Payment {
                        id: row.get(0)?,
                        grave_id: row.get(1)?,
                        year: row.get(2)?,
                        payment_date: row.get(3)?,
                        amount: row.get(4)?,
                        payment_method: row.get(5)?,
                        payment_proof: row.get(6)?,
                        paid_by: row.get(7)?,
                        notes: row.get(8)?,
                        created_at: row.get(9)?,
                        updated_at: row.get(10)?,
                    })
                },
            )
            .optional()
            .map_err(|e| format!("Failed to get payment: {}", e))?;
        
        Ok(payment)
    }
    
    /// Create new payment
    pub fn create_payment(&self, payment: &CreatePaymentRequest) -> Result<i64, String> {
        self.conn
            .execute(
                "INSERT INTO payments (grave_id, year, payment_date, amount, payment_method, payment_proof, paid_by, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                [
                    &payment.grave_id as &dyn rusqlite::ToSql,
                    &payment.year as &dyn rusqlite::ToSql,
                    &payment.payment_date as &dyn rusqlite::ToSql,
                    &payment.amount as &dyn rusqlite::ToSql,
                    &payment.payment_method.as_deref().unwrap_or("cash") as &dyn rusqlite::ToSql,
                    &payment.payment_proof.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                    &payment.paid_by.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                    &payment.notes.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                ],
            )
            .map_err(|e| format!("Failed to create payment: {}", e))?;
        
        Ok(self.conn.last_insert_rowid())
    }
    
    // ==================== SETTINGS ====================
    
    /// Get settings
    pub fn get_settings(&self) -> Result<Settings, String> {
        let settings = self.conn
            .query_row(
                "SELECT id, foundation_name, address, phone, email, logo_path, active_year, last_backup, auto_backup, created_at, updated_at FROM settings WHERE id = 1",
                [],
                |row| {
                    Ok(Settings {
                        id: row.get(0)?,
                        foundation_name: row.get(1)?,
                        address: row.get(2)?,
                        phone: row.get(3)?,
                        email: row.get(4)?,
                        logo_path: row.get(5)?,
                        active_year: row.get(6)?,
                        last_backup: row.get(7)?,
                        auto_backup: row.get::<_, i64>(8)? != 0,
                        created_at: row.get(9)?,
                        updated_at: row.get(10)?,
                    })
                },
            )
            .map_err(|e| format!("Failed to get settings: {}", e))?;
        
        Ok(settings)
    }
    
    /// Update settings
    pub fn update_settings(&self, settings: &UpdateSettingsRequest) -> Result<(), String> {
        self.conn
            .execute(
                "UPDATE settings SET foundation_name = COALESCE(?1, foundation_name), address = COALESCE(?2, address), phone = COALESCE(?3, phone), email = COALESCE(?4, email), logo_path = COALESCE(?5, logo_path), active_year = COALESCE(?6, active_year), auto_backup = COALESCE(?7, auto_backup) WHERE id = 1",
                [
                    &settings.foundation_name,
                    &settings.address,
                    &settings.phone,
                    &settings.email,
                    &settings.logo_path,
                    &settings.active_year.map(|y| y.to_string()),
                    &settings.auto_backup.map(|b| if b { "1" } else { "0" }.to_string()),
                ],
            )
            .map_err(|e| format!("Failed to update settings: {}", e))?;
        
        Ok(())
    }
    
    /// Update last backup time
    pub fn update_last_backup(&self) -> Result<(), String> {
        self.conn
            .execute(
                "UPDATE settings SET last_backup = CURRENT_TIMESTAMP WHERE id = 1",
                [],
            )
            .map_err(|e| format!("Failed to update last backup: {}", e))?;
        Ok(())
    }
}

// ==================== DATA STRUCTURES ====================

/// Database statistics for UI display
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DatabaseStats {
    pub graves_count: i64,
    pub heirs_count: i64,
    pub payments_count: i64,
    pub size_bytes: i64,
}

impl DatabaseStats {
    /// Format database size to readable string
    pub fn formatted_size(&self) -> String {
        let size = self.size_bytes as f64;
        if size < 1024.0 {
            format!("{} B", size as i64)
        } else if size < 1024.0 * 1024.0 {
            format!("{:.1} KB", size / 1024.0)
        } else {
            format!("{:.1} MB", size / (1024.0 * 1024.0))
        }
    }
    
    /// Total records
    pub fn total_records(&self) -> i64 {
        self.graves_count + self.heirs_count + self.payments_count
    }
}

/// Block data structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Block {
    pub id: i64,
    pub code: String,
    pub description: Option<String>,
    pub total_capacity: i64,
    pub annual_fee: i64,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateBlockRequest {
    pub code: String,
    pub description: Option<String>,
    pub total_capacity: i64,
    pub annual_fee: i64,
    pub status: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UpdateBlockRequest {
    pub code: Option<String>,
    pub description: Option<String>,
    pub total_capacity: Option<i64>,
    pub annual_fee: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BlockStats {
    pub total_capacity: i64,
    pub occupied: i64,
    pub available: i64,
}

/// Grave data structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Grave {
    pub id: i64,
    pub deceased_name: String,
    pub block_id: i64,
    pub number: String,
    pub date_of_death: String,
    pub burial_date: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GraveWithBlock {
    pub id: i64,
    pub deceased_name: String,
    pub block_id: i64,
    pub number: String,
    pub date_of_death: String,
    pub burial_date: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub code: String,
    pub annual_fee: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateGraveRequest {
    pub deceased_name: String,
    pub block_id: i64,
    pub number: String,
    pub date_of_death: String,
    pub burial_date: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UpdateGraveRequest {
    pub deceased_name: Option<String>,
    pub block_id: Option<i64>,
    pub number: Option<String>,
    pub date_of_death: Option<String>,
    pub burial_date: Option<String>,
    pub notes: Option<String>,
}

/// Heir data structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Heir {
    pub id: i64,
    pub grave_id: i64,
    pub order_number: i64,
    pub full_name: String,
    pub phone_number: Option<String>,
    pub relationship: Option<String>,
    pub address: Option<String>,
    pub is_primary: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateHeirRequest {
    pub grave_id: i64,
    pub order_number: i64,
    pub full_name: String,
    pub phone_number: Option<String>,
    pub relationship: Option<String>,
    pub address: Option<String>,
    pub is_primary: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UpdateHeirRequest {
    pub full_name: Option<String>,
    pub phone_number: Option<String>,
    pub relationship: Option<String>,
    pub address: Option<String>,
    pub is_primary: Option<bool>,
}

/// Payment data structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Payment {
    pub id: i64,
    pub grave_id: i64,
    pub year: i32,
    pub payment_date: String,
    pub amount: i64,
    pub payment_method: Option<String>,
    pub payment_proof: Option<String>,
    pub paid_by: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreatePaymentRequest {
    pub grave_id: i64,
    pub year: i32,
    pub payment_date: String,
    pub amount: i64,
    pub payment_method: Option<String>,
    pub payment_proof: Option<String>,
    pub paid_by: Option<String>,
    pub notes: Option<String>,
}

/// Settings data structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Settings {
    pub id: i64,
    pub foundation_name: String,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub logo_path: Option<String>,
    pub active_year: i32,
    pub last_backup: Option<String>,
    pub auto_backup: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UpdateSettingsRequest {
    pub foundation_name: Option<String>,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub logo_path: Option<String>,
    pub active_year: Option<i32>,
    pub auto_backup: Option<bool>,
}

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
    
    #[test]
    fn test_database_init() {
        let temp_path = env::temp_dir().join("test_astana.db");
        
        // Delete old file if exists
        if temp_path.exists() {
            fs::remove_file(&temp_path).unwrap();
        }
        
        // Test initialization
        let db = Database::init_with_path(temp_path.clone()).unwrap();
        
        // Verify tables created
        assert!(db.verify().unwrap());
        
        // Cleanup
        fs::remove_file(&temp_path).unwrap();
    }
    
    #[test]
    fn test_database_stats() {
        let temp_path = env::temp_dir().join("test_astana_stats.db");
        
        if temp_path.exists() {
            fs::remove_file(&temp_path).unwrap();
        }
        
        let db = Database::init_with_path(temp_path.clone()).unwrap();
        let stats = db.get_stats().unwrap();
        
        // Verify stats
        assert!(stats.graves_count >= 0);
        assert!(stats.size_bytes >= 0);
        
        fs::remove_file(&temp_path).unwrap();
    }
}
