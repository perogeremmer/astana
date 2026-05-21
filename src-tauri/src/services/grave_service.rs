use rusqlite::OptionalExtension;

use crate::db::Database;
use crate::models::*;

impl Database {
    pub fn get_graves(
        &self,
        search: Option<String>,
        block_id: Option<i64>,
        limit: i64,
        offset: i64,
        sort_field: Option<String>,
        sort_order: Option<String>,
    ) -> Result<Vec<GraveWithBlock>, String> {
        let mut query = String::from(
            "SELECT g.id, g.deceased_name, g.block_id, g.number, g.birth_place, g.birth_date, g.date_of_death, g.burial_date, g.notes, g.grave_type, g.initial_fee_amount, g.initial_fee_payment_date, g.initial_fee_payment_method, g.initial_fee_payment_proof, g.created_at, g.updated_at,
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
        let order_by = match sort_field.as_deref() {
            Some("nama") => "g.deceased_name",
            Some("blok") => "b.code, g.number",
            Some("tanggal_wafat") => "g.date_of_death",
            Some("tanggal_dibuat") => "g.created_at",
            _ => "g.created_at",
        };
        let order_dir = if sort_order.as_deref() == Some("desc") { "DESC" } else { "ASC" };
        query.push_str(&format!(" ORDER BY {} {} LIMIT ? OFFSET ?", order_by, order_dir));
        params.push(Box::new(limit));
        params.push(Box::new(offset));
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        let mut stmt = self.conn.prepare(&query)
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let graves = stmt
            .query_map(param_refs.as_slice(), |row| {
                Ok(GraveWithBlock {
                    id: row.get(0)?, deceased_name: row.get(1)?, block_id: row.get(2)?,
                    number: row.get(3)?, birth_place: row.get(4)?, birth_date: row.get(5)?,
                    date_of_death: row.get(6)?, burial_date: row.get(7)?, notes: row.get(8)?,
                    grave_type: row.get(9)?, initial_fee_amount: row.get(10)?,
                    initial_fee_payment_date: row.get(11)?, initial_fee_payment_method: row.get(12)?,
                    initial_fee_payment_proof: row.get(13)?, created_at: row.get(14)?,
                    updated_at: row.get(15)?, code: row.get(16)?, annual_fee: row.get(17)?,
                })
            })
            .map_err(|e| format!("Failed to query graves: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect graves: {}", e))?;
        Ok(graves)
    }

    pub fn create_grave(&self, grave: &CreateGraveRequest) -> Result<i64, String> {
        self.conn
            .execute(
                "INSERT INTO graves (deceased_name, block_id, number, birth_place, birth_date, date_of_death, burial_date, notes, grave_type, initial_fee_amount, initial_fee_payment_date, initial_fee_payment_method, initial_fee_payment_proof) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                [
                    &grave.deceased_name as &dyn rusqlite::ToSql,
                    &grave.block_id as &dyn rusqlite::ToSql,
                    &grave.number as &dyn rusqlite::ToSql,
                    &grave.birth_place.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                    &grave.birth_date.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                    &grave.date_of_death as &dyn rusqlite::ToSql,
                    &grave.burial_date.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                    &grave.notes.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                    &grave.grave_type as &dyn rusqlite::ToSql,
                    &grave.initial_fee_amount as &dyn rusqlite::ToSql,
                    &grave.initial_fee_payment_date.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                    &grave.initial_fee_payment_method.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                    &grave.initial_fee_payment_proof.as_deref().unwrap_or("") as &dyn rusqlite::ToSql,
                ],
            )
            .map_err(|e| format!("Failed to create grave: {}", e))?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_grave_by_id(&self, id: i64) -> Result<Option<GraveWithBlock>, String> {
        let grave = self.conn
            .query_row(
                "SELECT g.id, g.deceased_name, g.block_id, g.number, g.birth_place, g.birth_date, g.date_of_death, g.burial_date, g.notes, g.grave_type, g.initial_fee_amount, g.initial_fee_payment_date, g.initial_fee_payment_method, g.initial_fee_payment_proof, g.created_at, g.updated_at,
                        b.code, b.annual_fee
                 FROM graves g
                 JOIN blocks b ON g.block_id = b.id
                 WHERE g.id = ?1",
                [id],
                |row| {
                    Ok(GraveWithBlock {
                        id: row.get(0)?, deceased_name: row.get(1)?, block_id: row.get(2)?,
                        number: row.get(3)?, birth_place: row.get(4)?, birth_date: row.get(5)?,
                        date_of_death: row.get(6)?, burial_date: row.get(7)?, notes: row.get(8)?,
                        grave_type: row.get(9)?, initial_fee_amount: row.get(10)?,
                        initial_fee_payment_date: row.get(11)?, initial_fee_payment_method: row.get(12)?,
                        initial_fee_payment_proof: row.get(13)?, created_at: row.get(14)?,
                        updated_at: row.get(15)?, code: row.get(16)?, annual_fee: row.get(17)?,
                    })
                },
            )
            .optional()
            .map_err(|e| format!("Failed to get grave: {}", e))?;
        Ok(grave)
    }

    pub fn update_grave(&self, id: i64, grave: &UpdateGraveRequest) -> Result<(), String> {
        self.conn
            .execute(
                "UPDATE graves SET deceased_name = COALESCE(?1, deceased_name), block_id = COALESCE(?2, block_id), number = COALESCE(?3, number), birth_place = COALESCE(?4, birth_place), birth_date = COALESCE(?5, birth_date), date_of_death = COALESCE(?6, date_of_death), burial_date = COALESCE(?7, burial_date), notes = COALESCE(?8, notes), grave_type = COALESCE(?9, grave_type), initial_fee_amount = COALESCE(?10, initial_fee_amount), initial_fee_payment_date = COALESCE(?11, initial_fee_payment_date), initial_fee_payment_method = COALESCE(?12, initial_fee_payment_method), initial_fee_payment_proof = COALESCE(?13, initial_fee_payment_proof) WHERE id = ?14",
                [
                    &grave.deceased_name as &dyn rusqlite::ToSql,
                    &grave.block_id.map(|v| v.to_string()) as &dyn rusqlite::ToSql,
                    &grave.number as &dyn rusqlite::ToSql,
                    &grave.birth_place as &dyn rusqlite::ToSql,
                    &grave.birth_date as &dyn rusqlite::ToSql,
                    &grave.date_of_death as &dyn rusqlite::ToSql,
                    &grave.burial_date as &dyn rusqlite::ToSql,
                    &grave.notes as &dyn rusqlite::ToSql,
                    &grave.grave_type as &dyn rusqlite::ToSql,
                    &grave.initial_fee_amount.map(|v| v.to_string()) as &dyn rusqlite::ToSql,
                    &grave.initial_fee_payment_date as &dyn rusqlite::ToSql,
                    &grave.initial_fee_payment_method as &dyn rusqlite::ToSql,
                    &grave.initial_fee_payment_proof as &dyn rusqlite::ToSql,
                    &id as &dyn rusqlite::ToSql,
                ],
            )
            .map_err(|e| format!("Failed to update grave: {}", e))?;
        Ok(())
    }

    pub fn delete_grave(&self, id: i64) -> Result<(), String> {
        self.conn.execute("DELETE FROM graves WHERE id = ?1", [id])
            .map_err(|e| format!("Failed to delete grave: {}", e))?;
        Ok(())
    }

    pub fn count_graves(&self, search: Option<String>, block_id: Option<i64>) -> Result<i64, String> {
        let mut query = String::from("SELECT COUNT(*) FROM graves g WHERE 1=1");
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

    pub fn get_all_graves_with_heirs(&self, search: Option<String>, block_id: Option<i64>) -> Result<Vec<GraveExportData>, String> {
        let mut query = String::from(
            "SELECT g.id, g.deceased_name, g.block_id, g.number, g.birth_place, g.birth_date, g.date_of_death, g.burial_date, g.notes, g.grave_type, g.initial_fee_amount, g.initial_fee_payment_date, g.initial_fee_payment_method, g.initial_fee_payment_proof, g.created_at, g.updated_at,
                    b.code, b.annual_fee
                    FROM graves g
                    JOIN blocks b ON g.block_id = b.id
                    WHERE 1=1"
        );
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        if let Some(s) = &search {
            query.push_str(" AND (g.deceased_name LIKE ? OR g.number LIKE ?)");
            let pattern = format!("%{}%", s);
            params.push(Box::new(pattern.clone()));
            params.push(Box::new(pattern));
        }
        if let Some(bid) = block_id {
            query.push_str(" AND g.block_id = ?");
            params.push(Box::new(bid));
        }
        query.push_str(" ORDER BY b.code, g.number");
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        let mut stmt = self.conn.prepare(&query)
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let graves = stmt
            .query_map(param_refs.as_slice(), |row| {
                Ok(GraveWithBlock {
                    id: row.get(0)?, deceased_name: row.get(1)?, block_id: row.get(2)?,
                    number: row.get(3)?, birth_place: row.get(4)?, birth_date: row.get(5)?,
                    date_of_death: row.get(6)?, burial_date: row.get(7)?, notes: row.get(8)?,
                    grave_type: row.get(9)?, initial_fee_amount: row.get(10)?,
                    initial_fee_payment_date: row.get(11)?, initial_fee_payment_method: row.get(12)?,
                    initial_fee_payment_proof: row.get(13)?, created_at: row.get(14)?,
                    updated_at: row.get(15)?, code: row.get(16)?, annual_fee: row.get(17)?,
                })
            })
            .map_err(|e| format!("Failed to query graves: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect graves: {}", e))?;
        let mut result = Vec::new();
        for grave in graves {
            let heirs = self.get_heirs_by_grave(grave.id)?;
            let payments = self.get_payments_by_grave(grave.id)?;
            result.push(GraveExportData {
                id: grave.id, deceased_name: grave.deceased_name, block_code: grave.code,
                number: grave.number, birth_place: grave.birth_place, birth_date: grave.birth_date,
                date_of_death: grave.date_of_death, burial_date: grave.burial_date,
                notes: grave.notes, grave_type: grave.grave_type,
                initial_fee_amount: grave.initial_fee_amount,
                initial_fee_payment_date: grave.initial_fee_payment_date,
                initial_fee_payment_method: grave.initial_fee_payment_method,
                initial_fee_payment_proof: grave.initial_fee_payment_proof,
                annual_fee: grave.annual_fee, heirs, payments,
            });
        }
        Ok(result)
    }
}
