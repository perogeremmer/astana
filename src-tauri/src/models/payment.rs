#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Payment {
    pub id: i64,
    pub grave_id: i64,
    pub year: i32,
    pub payment_date: String,
    pub amount: i64,
    pub expected_fee: i64,
    pub payment_method: Option<String>,
    pub payment_proof: Option<String>,
    pub paid_by: Option<String>,
    pub notes: Option<String>,
    pub inputted_by: Option<i64>,
    pub received_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreatePaymentRequest {
    pub grave_id: i64,
    pub year: i32,
    pub payment_date: String,
    pub amount: i64,
    pub expected_fee: i64,
    pub payment_method: Option<String>,
    pub payment_proof: Option<String>,
    pub paid_by: Option<String>,
    pub notes: Option<String>,
    pub inputted_by: Option<i64>,
    pub received_by: Option<String>,
}
