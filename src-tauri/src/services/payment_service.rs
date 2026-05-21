use rusqlite::OptionalExtension;
use crate::db::Database;
use crate::models::*;

impl Database {
    pub fn get_payments_by_grave(&self, grave_id: i64) -> Result<Vec<Payment>, String> {
        let mut stmt = self.conn.prepare("SELECT id, grave_id, year, payment_date, amount, expected_fee, payment_method, payment_proof, paid_by, notes, inputted_by, received_by, created_at, updated_at FROM payments WHERE grave_id = ?1 ORDER BY year DESC")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;
        let payments = stmt.query_map([grave_id], |row| {
            Ok(Payment { id: row.get(0)?, grave_id: row.get(1)?, year: row.get(2)?, payment_date: row.get(3)?, amount: row.get(4)?, expected_fee: row.get(5)?, payment_method: row.get(6)?, payment_proof: row.get(7)?, paid_by: row.get(8)?, notes: row.get(9)?, inputted_by: row.get(10)?, received_by: row.get(11)?, created_at: row.get(12)?, updated_at: row.get(13)? })
        }).map_err(|e| format!("Failed to query payments: {}", e))?.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to collect payments: {}", e))?;
        Ok(payments)
    }

    pub fn get_payment_by_id(&self, payment_id: i64) -> Result<Option<Payment>, String> {
        let payment = self.conn.query_row(
            "SELECT id, grave_id, year, payment_date, amount, expected_fee, payment_method, payment_proof, paid_by, notes, inputted_by, received_by, created_at, updated_at FROM payments WHERE id = ?1",
            [payment_id], |row| Ok(Payment { id: row.get(0)?, grave_id: row.get(1)?, year: row.get(2)?, payment_date: row.get(3)?, amount: row.get(4)?, expected_fee: row.get(5)?, payment_method: row.get(6)?, payment_proof: row.get(7)?, paid_by: row.get(8)?, notes: row.get(9)?, inputted_by: row.get(10)?, received_by: row.get(11)?, created_at: row.get(12)?, updated_at: row.get(13)? }),
        ).optional().map_err(|e| format!("Failed to get payment: {}", e))?;
        Ok(payment)
    }

    pub fn get_payment_by_grave_and_year(&self, grave_id: i64, year: i32) -> Result<Option<Payment>, String> {
        let payment = self.conn.query_row(
            "SELECT id, grave_id, year, payment_date, amount, expected_fee, payment_method, payment_proof, paid_by, notes, inputted_by, received_by, created_at, updated_at FROM payments WHERE grave_id = ?1 AND year = ?2",
            [grave_id.to_string(), year.to_string()], |row| Ok(Payment { id: row.get(0)?, grave_id: row.get(1)?, year: row.get(2)?, payment_date: row.get(3)?, amount: row.get(4)?, expected_fee: row.get(5)?, payment_method: row.get(6)?, payment_proof: row.get(7)?, paid_by: row.get(8)?, notes: row.get(9)?, inputted_by: row.get(10)?, received_by: row.get(11)?, created_at: row.get(12)?, updated_at: row.get(13)? }),
        ).optional().map_err(|e| format!("Failed to get payment: {}", e))?;
        Ok(payment)
    }

    pub fn create_payment(&self, payment: &CreatePaymentRequest) -> Result<i64, String> {
        let expected_fee = if payment.expected_fee > 0 { payment.expected_fee } else {
            self.conn.query_row("SELECT b.annual_fee FROM graves g JOIN blocks b ON g.block_id = b.id WHERE g.id = ?1", [&payment.grave_id], |row| row.get::<_, i64>(0)).unwrap_or(0)
        };
        self.conn.execute(
            "INSERT INTO payments (grave_id, year, payment_date, amount, expected_fee, payment_method, payment_proof, paid_by, notes, inputted_by, received_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            [&payment.grave_id as &dyn rusqlite::ToSql, &payment.year as &dyn rusqlite::ToSql, &payment.payment_date as &dyn rusqlite::ToSql, &payment.amount as &dyn rusqlite::ToSql, &expected_fee as &dyn rusqlite::ToSql, &payment.payment_method.as_deref().unwrap_or("cash") as &dyn rusqlite::ToSql, &payment.payment_proof.as_deref().unwrap_or("") as &dyn rusqlite::ToSql, &payment.paid_by.as_deref().unwrap_or("") as &dyn rusqlite::ToSql, &payment.notes.as_deref().unwrap_or("") as &dyn rusqlite::ToSql, &payment.inputted_by as &dyn rusqlite::ToSql, &payment.received_by.as_deref().unwrap_or("") as &dyn rusqlite::ToSql],
        ).map_err(|e| format!("Failed to create payment: {}", e))?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn create_multi_payments(&self, payments: &[CreatePaymentRequest]) -> Result<Vec<i64>, String> {
        let mut results = Vec::new();
        for payment in payments { results.push(self.create_payment(payment)?); }
        Ok(results)
    }

    pub fn delete_payment(&self, id: i64) -> Result<(), String> {
        self.conn.execute("DELETE FROM payments WHERE id = ?1", [id]).map_err(|e| format!("Failed to delete payment: {}", e))?;
        Ok(())
    }
}
