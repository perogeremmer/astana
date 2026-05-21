use std::collections::HashMap;
use chrono::Datelike;
use crate::db::Database;
use crate::models::*;

impl Database {
    pub fn get_total_capacity(&self) -> Result<i64, String> {
        let total_capacity: i64 = self.conn.query_row("SELECT COALESCE(SUM(total_capacity), 0) FROM blocks", [], |row| row.get::<_, i64>(0)).map_err(|e| format!("Failed to get total capacity: {}", e))?;
        Ok(total_capacity)
    }

    pub fn get_yearly_report(&self, year: i32) -> Result<YearlyReport, String> {
        let active_year: i32 = self.conn.query_row("SELECT active_year FROM settings WHERE id = 1", [], |row| row.get(0)).unwrap_or(year);
        let mut stmt = self.conn.prepare("SELECT b.id, b.code, b.annual_fee, b.total_capacity, COUNT(g.id) as total_graves, COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as paid_count, COUNT(CASE WHEN p.id IS NULL THEN 1 END) as unpaid_count, COALESCE(SUM(p.amount), 0) as total_revenue FROM blocks b LEFT JOIN graves g ON b.id = g.block_id LEFT JOIN payments p ON g.id = p.grave_id AND p.year = ?1 GROUP BY b.id, b.code, b.annual_fee, b.total_capacity ORDER BY b.code")
            .map_err(|e| format!("Failed to prepare yearly report query: {}", e))?;
        let block_reports: Vec<BlockReport> = stmt.query_map([year], |row| {
            let total_capacity: i64 = row.get(3)?; let total_graves: i64 = row.get(4)?; let paid_count: i64 = row.get(5)?; let unpaid_count: i64 = row.get(6)?; let annual_fee: i64 = row.get(2)?; let total_revenue: i64 = row.get(7)?;
            Ok(BlockReport { block_id: row.get(0)?, block_code: row.get(1)?, total_capacity, total_graves, paid_count, unpaid_count, annual_fee, total_revenue, expected_revenue: total_graves * annual_fee, collection_rate: if total_graves > 0 { (paid_count as f64 / total_graves as f64) * 100.0 } else { 0.0 } })
        }).map_err(|e| format!("Failed to query yearly report: {}", e))?.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to collect block reports: {}", e))?;
        let total_graves: i64 = block_reports.iter().map(|r| r.total_graves).sum();
        let total_paid: i64 = block_reports.iter().map(|r| r.paid_count).sum();
        let total_unpaid: i64 = block_reports.iter().map(|r| r.unpaid_count).sum();
        let total_revenue: i64 = block_reports.iter().map(|r| r.total_revenue).sum();
        let total_expected: i64 = block_reports.iter().map(|r| r.expected_revenue).sum();
        let new_graves_count: i64 = self.conn.query_row("SELECT COUNT(*) FROM graves WHERE strftime('%Y', created_at) = ?1", [year.to_string()], |row| row.get(0)).unwrap_or(0);
        let mut stmt_new = self.conn.prepare("SELECT b.id, COUNT(g.id) as new_count FROM blocks b LEFT JOIN graves g ON b.id = g.block_id AND strftime('%Y', g.created_at) = ?1 GROUP BY b.id").map_err(|e| format!("Failed to prepare new graves query: {}", e))?;
        let new_graves_per_block: HashMap<i64, i64> = stmt_new.query_map([year.to_string()], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?))).map_err(|e| format!("Failed to query new graves: {}", e))?.collect::<Result<HashMap<i64, i64>, _>>().map_err(|e| format!("Failed to collect new graves: {}", e))?;
        let overall_collection_rate = if total_graves > 0 { (total_paid as f64 / total_graves as f64) * 100.0 } else { 0.0 };
        Ok(YearlyReport { year, active_year, total_graves, total_paid, total_unpaid, total_revenue, total_expected_revenue: total_expected, overall_collection_rate, new_graves_count, block_reports, new_graves_per_block })
    }

    pub fn get_available_years(&self) -> Result<Vec<i32>, String> {
        let mut years: Vec<i32> = Vec::new();
        let mut stmt = self.conn.prepare("SELECT DISTINCT year FROM payments ORDER BY year DESC").map_err(|e| format!("Failed to prepare years query: {}", e))?;
        years.extend(stmt.query_map([], |row| row.get::<_, i32>(0)).map_err(|e| format!("Failed to query payment years: {}", e))?.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to collect payment years: {}", e))?);
        let mut stmt2 = self.conn.prepare("SELECT DISTINCT CAST(strftime('%Y', created_at) AS INTEGER) FROM graves ORDER BY created_at DESC").map_err(|e| format!("Failed to prepare grave years query: {}", e))?;
        years.extend(stmt2.query_map([], |row| row.get::<_, i32>(0)).map_err(|e| format!("Failed to query grave years: {}", e))?.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to collect grave years: {}", e))?);
        let current_year: i32 = chrono::Local::now().year();
        years.push(current_year);
        let active_year: i32 = self.conn.query_row("SELECT active_year FROM settings WHERE id = 1", [], |row| row.get(0)).unwrap_or(current_year);
        years.push(active_year);
        years.sort_unstable(); years.dedup(); years.reverse();
        Ok(years)
    }

    pub fn get_grave_payment_detail(&self, grave_id: i64) -> Result<Option<GravePaymentDetailWithHeir>, String> {
        let mut stmt = self.conn.prepare("SELECT g.id, g.deceased_name, g.grave_type, g.number, b.code as block_code, b.annual_fee, h.full_name as heir_name, h.address as heir_address, g.notes FROM graves g JOIN blocks b ON g.block_id = b.id LEFT JOIN heirs h ON g.id = h.grave_id AND h.order_number = 1 WHERE g.id = ?1")
            .map_err(|e| format!("Failed to prepare grave payment detail query: {}", e))?;
        let result = stmt.query_map([grave_id], |row| Ok(GravePaymentDetailWithHeir { grave_id: row.get(0)?, deceased_name: row.get(1)?, grave_type: row.get(2)?, grave_number: row.get(3)?, block_code: row.get(4)?, annual_fee: row.get(5)?, heir_name: row.get(6)?, heir_address: row.get(7)?, notes: row.get(8)? }))
            .map_err(|e| format!("Failed to query grave payment detail: {}", e))?.next().transpose().map_err(|e| format!("Failed to collect grave payment detail: {}", e))?;
        Ok(result)
    }

    pub fn get_graves_payment_detail(&self, year: i32) -> Result<Vec<GravePaymentDetail>, String> {
        let mut stmt = self.conn.prepare("SELECT g.id, g.deceased_name, b.code as block_code, g.number, b.annual_fee, p.id as payment_id, p.amount, p.payment_date FROM graves g JOIN blocks b ON g.block_id = b.id LEFT JOIN payments p ON g.id = p.grave_id AND p.year = ?1 ORDER BY b.code, g.number")
            .map_err(|e| format!("Failed to prepare payment detail query: {}", e))?;
        let details = stmt.query_map([year], |row| {
            let payment_id: Option<i64> = row.get(5)?;
            Ok(GravePaymentDetail { id: row.get(0)?, deceased_name: row.get(1)?, block_code: row.get(2)?, grave_number: row.get(3)?, annual_fee: row.get(4)?, status: if payment_id.is_some() { PaymentStatus::Paid } else { PaymentStatus::Unpaid }, amount: row.get(6)?, payment_date: row.get(7)? })
        }).map_err(|e| format!("Failed to query payment detail: {}", e))?.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to collect payment detail: {}", e))?;
        Ok(details)
    }
}
