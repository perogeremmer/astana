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
