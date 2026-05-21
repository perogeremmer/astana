#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Settings {
    pub id: i64,
    pub foundation_name: String,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub logo_path: Option<String>,
    pub active_year: i32,
    pub last_backup: Option<String>,
    pub auto_backup: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UpdateSettingsRequest {
    pub foundation_name: Option<String>,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub logo_path: Option<String>,
    pub active_year: Option<i32>,
    pub auto_backup: Option<bool>,
}
