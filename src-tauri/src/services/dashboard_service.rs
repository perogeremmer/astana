use crate::db::Database;
use crate::models::*;

impl Database {
    pub fn get_recent_payments(&self, limit: i64) -> Result<Vec<RecentPayment>, String> {
        let mut stmt = self.conn.prepare("SELECT p.id, p.grave_id, p.year, p.payment_date, p.amount, g.deceased_name, b.code, g.number FROM payments p JOIN graves g ON p.grave_id = g.id JOIN blocks b ON g.block_id = b.id ORDER BY p.payment_date DESC, p.created_at DESC LIMIT ?1")
            .map_err(|e| format!("Failed to prepare recent payments query: {}", e))?;
        let payments = stmt.query_map([limit], |row| Ok(RecentPayment { id: row.get(0)?, grave_id: row.get(1)?, year: row.get(2)?, payment_date: row.get(3)?, amount: row.get(4)?, deceased_name: row.get(5)?, block_code: row.get(6)?, grave_number: row.get(7)? }))
            .map_err(|e| format!("Failed to query recent payments: {}", e))?.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to collect recent payments: {}", e))?;
        Ok(payments)
    }

    pub fn get_recent_graves(&self, limit: i64) -> Result<Vec<RecentGrave>, String> {
        let active_year: i32 = self.conn.query_row("SELECT active_year FROM settings WHERE id = 1", [], |row| row.get(0)).unwrap_or(2026);
        let mut stmt = self.conn.prepare("SELECT g.id, g.deceased_name, g.date_of_death, g.created_at, b.code, g.number FROM graves g JOIN blocks b ON g.block_id = b.id ORDER BY g.created_at DESC LIMIT ?1")
            .map_err(|e| format!("Failed to prepare recent graves query: {}", e))?;
        let graves = stmt.query_map([limit], |row| {
            let grave_id: i64 = row.get(0)?;
            Ok(RecentGrave { id: grave_id, deceased_name: row.get(1)?, date_of_death: row.get(2)?, created_at: row.get(3)?, block_code: row.get(4)?, grave_number: row.get(5)?, has_paid_current_year: self.get_payment_by_grave_and_year(grave_id, active_year).map(|p| p.is_some()).unwrap_or(false) })
        }).map_err(|e| format!("Failed to query recent graves: {}", e))?.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to collect recent graves: {}", e))?;
        Ok(graves)
    }

    pub fn get_financial_summary(&self, year: i32) -> Result<FinancialSummary, String> {
        let total_revenue: i64 = self.conn.query_row("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE year = ?1", [year], |row| row.get(0)).unwrap_or(0);
        let unpaid_count: i64 = self.conn.query_row("SELECT COUNT(*) FROM graves g WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.grave_id = g.id AND p.year = ?1)", [year], |row| row.get(0)).unwrap_or(0);
        let total_arrears: i64 = self.conn.query_row("SELECT COALESCE(SUM(b.annual_fee), 0) FROM graves g JOIN blocks b ON g.block_id = b.id WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.grave_id = g.id AND p.year = ?1)", [year], |row| row.get(0)).unwrap_or(0);
        let new_graves_this_month: i64 = self.conn.query_row("SELECT COUNT(*) FROM graves WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')", [], |row| row.get(0)).unwrap_or(0);
        let new_graves_this_year: i64 = self.conn.query_row("SELECT COUNT(*) FROM graves WHERE strftime('%Y', created_at) = strftime('%Y', 'now')", [], |row| row.get(0)).unwrap_or(0);
        Ok(FinancialSummary { year, total_revenue, unpaid_count, total_arrears, new_graves_this_month, new_graves_this_year })
    }

    pub fn get_dashboard_stats(&self) -> Result<DashboardStats, String> {
        let active_year: i32 = self.conn.query_row("SELECT active_year FROM settings WHERE id = 1", [], |row| row.get(0)).unwrap_or(2026);
        let total_graves: i64 = self.conn.query_row("SELECT COUNT(*) FROM graves", [], |row| row.get(0)).unwrap_or(0);
        let total_blocks: i64 = self.conn.query_row("SELECT COUNT(*) FROM blocks", [], |row| row.get(0)).unwrap_or(0);
        let total_heirs: i64 = self.conn.query_row("SELECT COUNT(*) FROM heirs", [], |row| row.get(0)).unwrap_or(0);
        let financial = self.get_financial_summary(active_year)?;
        Ok(DashboardStats { active_year, total_graves, total_blocks, total_heirs, total_revenue: financial.total_revenue, total_arrears: financial.total_arrears, unpaid_count: financial.unpaid_count, new_graves_this_month: financial.new_graves_this_month, new_graves_this_year: financial.new_graves_this_year })
    }

    pub fn get_days_since_backup(&self) -> Result<i64, String> {
        let result = self.conn.query_row("SELECT CASE WHEN last_backup IS NULL THEN 999 ELSE CAST((julianday('now') - julianday(last_backup)) AS INTEGER) END FROM settings WHERE id = 1", [], |row| row.get::<_, i64>(0)).unwrap_or(999);
        Ok(result)
    }
}
