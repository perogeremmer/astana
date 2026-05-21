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
