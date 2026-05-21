#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DatabaseStats {
    pub graves_count: i64,
    pub heirs_count: i64,
    pub payments_count: i64,
    pub size_bytes: i64,
}

impl DatabaseStats {
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

    pub fn total_records(&self) -> i64 {
        self.graves_count + self.heirs_count + self.payments_count
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RecentPayment {
    pub id: i64,
    pub grave_id: i64,
    pub year: i32,
    pub payment_date: String,
    pub amount: i64,
    pub deceased_name: String,
    pub block_code: String,
    pub grave_number: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RecentGrave {
    pub id: i64,
    pub deceased_name: String,
    pub date_of_death: Option<String>,
    pub created_at: String,
    pub block_code: String,
    pub grave_number: String,
    pub has_paid_current_year: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FinancialSummary {
    pub year: i32,
    pub total_revenue: i64,
    pub unpaid_count: i64,
    pub total_arrears: i64,
    pub new_graves_this_month: i64,
    pub new_graves_this_year: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DashboardStats {
    pub active_year: i32,
    pub total_graves: i64,
    pub total_blocks: i64,
    pub total_heirs: i64,
    pub total_revenue: i64,
    pub total_arrears: i64,
    pub unpaid_count: i64,
    pub new_graves_this_month: i64,
    pub new_graves_this_year: i64,
}
