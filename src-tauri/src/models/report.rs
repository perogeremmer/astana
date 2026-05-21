use std::collections::HashMap;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct YearlyReport {
    pub year: i32,
    pub active_year: i32,
    pub total_graves: i64,
    pub total_paid: i64,
    pub total_unpaid: i64,
    pub total_revenue: i64,
    pub total_expected_revenue: i64,
    pub overall_collection_rate: f64,
    pub new_graves_count: i64,
    pub block_reports: Vec<BlockReport>,
    pub new_graves_per_block: HashMap<i64, i64>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BlockReport {
    pub block_id: i64,
    pub block_code: String,
    pub total_capacity: i64,
    pub total_graves: i64,
    pub paid_count: i64,
    pub unpaid_count: i64,
    pub annual_fee: i64,
    pub total_revenue: i64,
    pub expected_revenue: i64,
    pub collection_rate: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum PaymentStatus {
    Paid,
    Unpaid,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GravePaymentDetail {
    pub id: i64,
    pub deceased_name: String,
    pub block_code: String,
    pub grave_number: String,
    pub annual_fee: i64,
    pub status: PaymentStatus,
    pub amount: Option<i64>,
    pub payment_date: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GravePaymentDetailWithHeir {
    pub grave_id: i64,
    pub deceased_name: String,
    pub grave_type: Option<String>,
    pub grave_number: String,
    pub block_code: String,
    pub annual_fee: i64,
    pub heir_name: Option<String>,
    pub heir_address: Option<String>,
    pub notes: Option<String>,
}
