use crate::models::heir::Heir;
use crate::models::payment::Payment;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Grave {
    pub id: i64,
    pub deceased_name: String,
    pub block_id: i64,
    pub number: String,
    pub date_of_death: Option<String>,
    pub burial_date: Option<String>,
    pub birth_place: Option<String>,
    pub birth_date: Option<String>,
    pub notes: Option<String>,
    pub grave_type: Option<String>,
    pub initial_fee_amount: i64,
    pub initial_fee_payment_date: Option<String>,
    pub initial_fee_payment_method: Option<String>,
    pub initial_fee_payment_proof: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GraveWithBlock {
    pub id: i64,
    pub deceased_name: String,
    pub block_id: i64,
    pub number: String,
    pub date_of_death: Option<String>,
    pub burial_date: Option<String>,
    pub birth_place: Option<String>,
    pub birth_date: Option<String>,
    pub notes: Option<String>,
    pub grave_type: Option<String>,
    pub initial_fee_amount: i64,
    pub initial_fee_payment_date: Option<String>,
    pub initial_fee_payment_method: Option<String>,
    pub initial_fee_payment_proof: Option<String>,
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
    pub birth_place: Option<String>,
    pub birth_date: Option<String>,
    pub notes: Option<String>,
    pub grave_type: String,
    pub initial_fee_amount: i64,
    pub initial_fee_payment_date: Option<String>,
    pub initial_fee_payment_method: Option<String>,
    pub initial_fee_payment_proof: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UpdateGraveRequest {
    pub deceased_name: Option<String>,
    pub block_id: Option<i64>,
    pub number: Option<String>,
    pub date_of_death: Option<String>,
    pub burial_date: Option<String>,
    pub birth_place: Option<String>,
    pub birth_date: Option<String>,
    pub notes: Option<String>,
    pub grave_type: Option<String>,
    pub initial_fee_amount: Option<i64>,
    pub initial_fee_payment_date: Option<String>,
    pub initial_fee_payment_method: Option<String>,
    pub initial_fee_payment_proof: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GraveExportData {
    pub id: i64,
    pub deceased_name: String,
    pub block_code: String,
    pub number: String,
    pub date_of_death: Option<String>,
    pub burial_date: Option<String>,
    pub birth_place: Option<String>,
    pub birth_date: Option<String>,
    pub notes: Option<String>,
    pub grave_type: Option<String>,
    pub initial_fee_amount: i64,
    pub initial_fee_payment_date: Option<String>,
    pub initial_fee_payment_method: Option<String>,
    pub initial_fee_payment_proof: Option<String>,
    pub annual_fee: i64,
    pub heirs: Vec<Heir>,
    pub payments: Vec<Payment>,
}
