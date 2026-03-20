// Astana - Manajemen Iuran Makam
// Library utama untuk aplikasi Tauri

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

use tauri::Manager;
use tauri::State;
use uuid::Uuid;

// Modul database
pub mod db;

// Global session storage
pub struct SessionStore {
    sessions: Mutex<HashMap<String, db::Session>>,
}

impl SessionStore {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn create_session(&self, user_id: i64, username: String, role: String) -> String {
        let token = Uuid::new_v4().to_string();
        let expires_at = chrono::Utc::now().timestamp() + (8 * 60 * 60); // 8 hours
        
        let session = db::Session {
            user_id,
            username,
            role,
            token: token.clone(),
            expires_at,
        };
        
        let mut sessions = self.sessions.lock().unwrap();
        sessions.insert(token.clone(), session);
        
        token
    }

    pub fn get_session(&self, token: &str) -> Option<db::Session> {
        let sessions = self.sessions.lock().unwrap();
        sessions.get(token).cloned()
    }

    pub fn remove_session(&self, token: &str) {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.remove(token);
    }

    pub fn is_valid(&self, token: &str) -> bool {
        if let Some(session) = self.get_session(token) {
            let now = chrono::Utc::now().timestamp();
            session.expires_at > now
        } else {
            false
        }
    }

    pub fn cleanup_expired(&self) {
        let mut sessions = self.sessions.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        sessions.retain(|_, session| session.expires_at > now);
    }
}

// Global store untuk Superadmin_0 password yang di-generate
pub struct FirstRunState {
    pub superadmin_password: Mutex<Option<String>>,
}

impl FirstRunState {
    pub fn new() -> Self {
        Self {
            superadmin_password: Mutex::new(None),
        }
    }

    pub fn set_password(&self, password: String) {
        let mut pwd = self.superadmin_password.lock().unwrap();
        *pwd = Some(password);
    }

    pub fn get_and_clear_password(&self) -> Option<String> {
        let mut pwd = self.superadmin_password.lock().unwrap();
        pwd.take()
    }
}

/// Command untuk mendapatkan path database
#[tauri::command]
async fn get_database_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    db::get_db_path_command(app_handle)
}

/// Command untuk mendapatkan statistik database
#[tauri::command]
async fn get_database_stats(app_handle: tauri::AppHandle) -> Result<db::DatabaseStats, String> {
    db::get_db_stats(app_handle)
}

/// Command untuk backup database with dialog
#[tauri::command]
async fn backup_database_with_dialog(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let default_name = format!("astana_backup_{}.db", chrono::Local::now().format("%Y-%m-%d"));
    
    // Open save dialog
    let file_path = app_handle.dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("SQLite Database", &["db", "sqlite", "sqlite3"])
        .blocking_save_file();
    
    match file_path {
        Some(path) => {
            let backup_path = path.as_path().unwrap();
            db::backup_database_command(app_handle, backup_path.to_string_lossy().to_string())?;
            Ok("Database berhasil di-export".to_string())
        }
        None => Err("Dialog dibatalkan".to_string())
    }
}

/// Command untuk restore database with dialog
#[tauri::command]
async fn restore_database_with_dialog(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    
    // Open file dialog
    let file_path = app_handle.dialog()
        .file()
        .add_filter("SQLite Database", &["db", "sqlite", "sqlite3"])
        .blocking_pick_file();
    
    match file_path {
        Some(path) => {
            let backup_path = path.as_path().unwrap();
            let mut db = db::Database::init(&app_handle)?;
            db.restore_from(PathBuf::from(backup_path))?;
            Ok("Database berhasil di-restore".to_string())
        }
        None => Err("Dialog dibatalkan".to_string())
    }
}

/// Open database folder
#[tauri::command]
async fn open_database_folder(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    let db_path = db::Database::get_database_path(&app_handle)?;
    let folder_path = std::path::Path::new(&db_path)
        .parent()
        .ok_or("Failed to get parent folder")?;

    app_handle.opener()
        .open_path(folder_path.to_string_lossy(), None::<&str>)
        .map_err(|e| format!("Failed to open folder: {}", e))?;

    Ok(())
}

// ==================== BLOCKS COMMANDS ====================

/// Get all blocks
#[tauri::command]
async fn get_blocks(app_handle: tauri::AppHandle) -> Result<Vec<db::Block>, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_all_blocks()
}

/// Get block by ID
#[tauri::command]
async fn get_block_by_id(app_handle: tauri::AppHandle, id: i64) -> Result<Option<db::Block>, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_block_by_id(id)
}

/// Create new block
#[tauri::command]
async fn create_block(app_handle: tauri::AppHandle, block: db::CreateBlockRequest) -> Result<i64, String> {
    let db = db::Database::init(&app_handle)?;
    db.create_block(&block)
}

/// Update block
#[tauri::command]
async fn update_block(app_handle: tauri::AppHandle, id: i64, block: db::UpdateBlockRequest) -> Result<(), String> {
    let db = db::Database::init(&app_handle)?;
    db.update_block(id, &block)
}

/// Delete block
#[tauri::command]
async fn delete_block(app_handle: tauri::AppHandle, id: i64) -> Result<(), String> {
    let db = db::Database::init(&app_handle)?;
    db.delete_block(id)
}

/// Get block stats
#[tauri::command]
async fn get_block_stats(app_handle: tauri::AppHandle, block_id: i64) -> Result<db::BlockStats, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_block_stats(block_id)
}

// ==================== GRAVES COMMANDS ====================

/// Request untuk membuat grave dengan heirs
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateGraveWithHeirsRequest {
    pub grave: db::CreateGraveRequest,
    pub heirs: Vec<db::CreateHeirRequest>,
}

/// Get graves with pagination and search
#[tauri::command]
async fn get_graves(
    app_handle: tauri::AppHandle,
    search: Option<String>,
    block_id: Option<i64>,
    limit: i64,
    offset: i64,
) -> Result<Vec<db::GraveWithBlock>, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_graves(search, block_id, limit, offset)
}

/// Count graves for pagination
#[tauri::command]
async fn count_graves(
    app_handle: tauri::AppHandle,
    search: Option<String>,
    block_id: Option<i64>,
) -> Result<i64, String> {
    let db = db::Database::init(&app_handle)?;
    db.count_graves(search, block_id)
}

/// Get grave by ID
#[tauri::command]
async fn get_grave_by_id(
    app_handle: tauri::AppHandle,
    id: i64,
) -> Result<Option<db::GraveWithBlock>, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_grave_by_id(id)
}

/// Export graves data with heirs
#[tauri::command]
async fn export_graves(
    app_handle: tauri::AppHandle,
    search: Option<String>,
    block_id: Option<i64>,
    start_year: Option<i32>,
    end_year: Option<i32>,
) -> Result<ExportGravesResult, String> {
    let db = db::Database::init(&app_handle)?;
    
    // Get all graves with heirs and payments
    let graves = db.get_all_graves_with_heirs(search, block_id)?;
    
    // Determine year range from data if "all" is selected
    let (actual_start_year, actual_end_year) = if start_year.is_none() || end_year.is_none() {
        // Find min and max year from all payments
        let mut years: Vec<i32> = Vec::new();
        for grave in &graves {
            for payment in &grave.payments {
                years.push(payment.year);
            }
        }
        
        if years.is_empty() {
            // No payments at all, use a reasonable default range
            (2022, 2026)
        } else {
            years.sort_unstable();
            years.dedup();
            (*years.first().unwrap(), *years.last().unwrap())
        }
    } else {
        (start_year.unwrap(), end_year.unwrap())
    };
    
    Ok(ExportGravesResult {
        graves,
        start_year: actual_start_year,
        end_year: actual_end_year,
    })
}

/// Export result with year range info
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExportGravesResult {
    pub graves: Vec<db::GraveExportData>,
    pub start_year: i32,
    pub end_year: i32,
}

/// Save Excel file with dialog - auto open in Downloads or Documents
#[tauri::command]
async fn save_excel_file(
    app_handle: tauri::AppHandle,
    window: tauri::Window,
    file_data: Vec<u8>,
    default_name: String,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use tauri::Manager;
    
    // Get OS type
    let os_type = tauri_plugin_os::type_();
    
    // Determine default directory (Downloads > Documents > Home)
    let default_dir: Option<std::path::PathBuf> = app_handle
        .path()
        .download_dir()
        .or_else(|_| app_handle.path().document_dir())
        .or_else(|_| app_handle.path().home_dir())
        .ok();
    
    log::info!("OS detected: {}, Default save dir: {:?}", 
        match os_type {
            tauri_plugin_os::OsType::Windows => "Windows",
            tauri_plugin_os::OsType::Macos => "macOS",
            tauri_plugin_os::OsType::Linux => "Linux",
            _ => "Other",
        }, 
        default_dir
    );
    
    // Build dialog with starting directory
    let file_path = if let Some(dir) = default_dir {
        app_handle.dialog()
            .file()
            .set_parent(&window)
            .set_file_name(&default_name)
            .add_filter("Excel Files", &["xlsx"])
            .set_directory(dir)
            .blocking_save_file()
    } else {
        app_handle.dialog()
            .file()
            .set_parent(&window)
            .set_file_name(&default_name)
            .add_filter("Excel Files", &["xlsx"])
            .blocking_save_file()
    };
    
    match file_path {
        Some(path) => {
            // Get path as string
            let path_str = path.to_string();
            // Write file
            std::fs::write(&path_str, file_data)
                .map_err(|e| format!("Gagal menulis file: {}", e))?;
            Ok(Some(path_str))
        }
        None => Ok(None), // User cancelled
    }
}

/// Create new grave with heirs
#[tauri::command]
async fn create_grave_with_heirs(
    app_handle: tauri::AppHandle,
    request: CreateGraveWithHeirsRequest,
) -> Result<i64, String> {
    let db = db::Database::init(&app_handle)?;
    
    // Create grave
    let grave_id = db.create_grave(&request.grave)?;
    
    // Create heirs
    for mut heir in request.heirs {
        heir.grave_id = grave_id;
        db.create_heir(&heir)?;
    }
    
    Ok(grave_id)
}

/// Update grave
#[tauri::command]
async fn update_grave(
    app_handle: tauri::AppHandle,
    id: i64,
    grave: db::UpdateGraveRequest,
) -> Result<(), String> {
    let db = db::Database::init(&app_handle)?;
    db.update_grave(id, &grave)
}

/// Delete grave (will cascade delete heirs and payments)
#[tauri::command]
async fn delete_grave(
    app_handle: tauri::AppHandle,
    id: i64,
) -> Result<(), String> {
    let db = db::Database::init(&app_handle)?;
    db.delete_grave(id)
}

// ==================== HEIRS COMMANDS ====================

/// Get heirs by grave ID
#[tauri::command]
async fn get_heirs_by_grave(
    app_handle: tauri::AppHandle,
    grave_id: i64,
) -> Result<Vec<db::Heir>, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_heirs_by_grave(grave_id)
}

/// Create new heir
#[tauri::command]
async fn create_heir(
    app_handle: tauri::AppHandle,
    heir: db::CreateHeirRequest,
) -> Result<i64, String> {
    let db = db::Database::init(&app_handle)?;
    db.create_heir(&heir)
}

/// Update heir
#[tauri::command]
async fn update_heir(
    app_handle: tauri::AppHandle,
    id: i64,
    heir: db::UpdateHeirRequest,
) -> Result<(), String> {
    let db = db::Database::init(&app_handle)?;
    db.update_heir(id, &heir)
}

/// Delete heir
#[tauri::command]
async fn delete_heir(
    app_handle: tauri::AppHandle,
    id: i64,
) -> Result<(), String> {
    let db = db::Database::init(&app_handle)?;
    db.delete_heir(id)
}

/// Update heirs for a grave (bulk update - delete all and recreate)
#[tauri::command]
async fn update_grave_heirs(
    app_handle: tauri::AppHandle,
    grave_id: i64,
    heirs: Vec<db::CreateHeirRequest>,
) -> Result<(), String> {
    let db = db::Database::init(&app_handle)?;
    
    // Delete existing heirs
    db.delete_heirs_by_grave(grave_id)?;
    
    // Create new heirs
    for mut heir in heirs {
        heir.grave_id = grave_id;
        db.create_heir(&heir)?;
    }
    
    Ok(())
}

/// Get grave detail with heirs
#[tauri::command]
async fn get_grave_detail(
    app_handle: tauri::AppHandle,
    id: i64,
) -> Result<Option<GraveDetail>, String> {
    let db = db::Database::init(&app_handle)?;
    
    let grave = db.get_grave_by_id(id)?;
    
    match grave {
        Some(g) => {
            let heirs = db.get_heirs_by_grave(id)?;
            Ok(Some(GraveDetail {
                grave: g,
                heirs,
            }))
        }
        None => Ok(None),
    }
}

/// Grave detail response
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GraveDetail {
    pub grave: db::GraveWithBlock,
    pub heirs: Vec<db::Heir>,
}

// ==================== PAYMENTS COMMANDS ====================

/// Get payments by grave ID
#[tauri::command]
async fn get_payments_by_grave(
    app_handle: tauri::AppHandle,
    grave_id: i64,
) -> Result<Vec<db::Payment>, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_payments_by_grave(grave_id)
}

/// Get payment by grave and year
#[tauri::command]
async fn get_payment_by_grave_and_year(
    app_handle: tauri::AppHandle,
    grave_id: i64,
    year: i32,
) -> Result<Option<db::Payment>, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_payment_by_grave_and_year(grave_id, year)
}

/// Create new payment
#[tauri::command]
async fn create_payment(
    app_handle: tauri::AppHandle,
    payment: db::CreatePaymentRequest,
) -> Result<i64, String> {
    let db = db::Database::init(&app_handle)?;
    db.create_payment(&payment)
}

/// Update payment
#[tauri::command]
async fn update_payment(
    app_handle: tauri::AppHandle,
    _id: i64,
    payment: db::CreatePaymentRequest,
) -> Result<(), String> {
    let db = db::Database::init(&app_handle)?;
    // Use create payment request as update (simplified)
    db.create_payment(&payment)?;
    Ok(())
}

/// Delete payment
#[tauri::command]
async fn delete_payment(
    app_handle: tauri::AppHandle,
    id: i64,
) -> Result<(), String> {
    let db = db::Database::init(&app_handle)?;
    db.delete_payment(id)
}

/// Get graves with payment summary for payment page
#[tauri::command]
async fn get_graves_with_payment_summary(
    app_handle: tauri::AppHandle,
    search: Option<String>,
    block_id: Option<i64>,
    year: i32,
    limit: i64,
    offset: i64,
) -> Result<Vec<GravePaymentSummary>, String> {
    let db = db::Database::init(&app_handle)?;
    
    // Get graves
    let graves = db.get_graves(search.clone(), block_id, limit, offset)?;
    
    let mut result = Vec::new();
    for grave in graves {
        // Get payments for this grave
        let payments = db.get_payments_by_grave(grave.id)?;
        
        // Check if paid for requested year
        let payment_for_year = payments.iter().find(|p| p.year == year).cloned();
        
        // Get last 5 years payment status
        let current_year = year;
        let mut recent_payments = Vec::new();
        for y in (current_year - 4)..=current_year {
            let p = payments.iter().find(|p| p.year == y);
            recent_payments.push(YearPaymentStatus {
                year: y,
                is_paid: p.is_some(),
                amount: p.map(|pay| pay.amount),
            });
        }
        
        result.push(GravePaymentSummary {
            grave_id: grave.id,
            deceased_name: grave.deceased_name,
            block_code: grave.code,
            number: grave.number,
            annual_fee: grave.annual_fee,
            current_year_payment: payment_for_year,
            recent_payments,
        });
    }
    
    Ok(result)
}

/// Year payment status
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct YearPaymentStatus {
    pub year: i32,
    pub is_paid: bool,
    pub amount: Option<i64>,
}

/// Grave payment summary for payment page
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GravePaymentSummary {
    pub grave_id: i64,
    pub deceased_name: String,
    pub block_code: String,
    pub number: String,
    pub annual_fee: i64,
    pub current_year_payment: Option<db::Payment>,
    pub recent_payments: Vec<YearPaymentStatus>,
}

// ==================== DASHBOARD COMMANDS ====================

/// Get dashboard statistics
#[tauri::command]
async fn get_dashboard_stats(
    app_handle: tauri::AppHandle,
) -> Result<db::DashboardStats, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_dashboard_stats()
}

/// Get recent payments for dashboard
#[tauri::command]
async fn get_recent_payments(
    app_handle: tauri::AppHandle,
    limit: i64,
) -> Result<Vec<db::RecentPayment>, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_recent_payments(limit)
}

/// Get recently registered graves
#[tauri::command]
async fn get_recent_graves(
    app_handle: tauri::AppHandle,
    limit: i64,
) -> Result<Vec<db::RecentGrave>, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_recent_graves(limit)
}

/// Get financial summary
#[tauri::command]
async fn get_financial_summary(
    app_handle: tauri::AppHandle,
    year: i32,
) -> Result<db::FinancialSummary, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_financial_summary(year)
}

/// Get days since last backup
#[tauri::command]
async fn get_days_since_backup(
    app_handle: tauri::AppHandle,
) -> Result<i64, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_days_since_backup()
}

// ==================== REPORT COMMANDS ====================

/// Get yearly report
#[tauri::command]
async fn get_yearly_report(
    app_handle: tauri::AppHandle,
    year: i32,
) -> Result<db::YearlyReport, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_yearly_report(year)
}

/// Get available years for reports
#[tauri::command]
async fn get_available_years(
    app_handle: tauri::AppHandle,
) -> Result<Vec<i32>, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_available_years()
}

// ==================== SETTINGS COMMANDS ====================

/// Get settings
#[tauri::command]
async fn get_settings(
    app_handle: tauri::AppHandle,
) -> Result<db::Settings, String> {
    let db = db::Database::init(&app_handle)?;
    db.get_settings()
}

/// Update settings
#[tauri::command]
async fn update_settings(
    app_handle: tauri::AppHandle,
    settings: db::UpdateSettingsRequest,
) -> Result<(), String> {
    let db = db::Database::init(&app_handle)?;
    db.update_settings(&settings)
}

/// Update last backup time
#[tauri::command]
async fn update_last_backup(
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let db = db::Database::init(&app_handle)?;
    db.update_last_backup()
}

/// Upload logo file and save to public/images folder
#[tauri::command]
async fn upload_logo(
    app_handle: tauri::AppHandle,
    file_data: Vec<u8>,
    file_name: String,
) -> Result<String, String> {
    // Get app data directory
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {:?}", e))?;
    
    // Create images folder if not exists
    let images_dir = app_data_dir.join("images");
    std::fs::create_dir_all(&images_dir)
        .map_err(|e| format!("Failed to create images directory: {}", e))?;
    
    // Generate unique filename
    let timestamp = chrono::Local::now().timestamp();
    let ext = std::path::Path::new(&file_name)
        .extension()
        .and_then(|e: &std::ffi::OsStr| e.to_str())
        .unwrap_or("png");
    let new_filename = format!("logo_{}. {}", timestamp, ext);
    let file_path = images_dir.join(&new_filename);
    
    // Write file
    std::fs::write(&file_path, file_data)
        .map_err(|e| format!("Failed to write logo file: {}", e))?;
    
    // Return relative path
    Ok(format!("images/{}", new_filename))
}

// ==================== AUTHENTICATION COMMANDS ====================

/// Check database status - returns object with exists and is_empty fields
#[tauri::command]
async fn check_database_status(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    // Check if database file exists
    let db_path = db::Database::get_database_path(&app_handle)?;
    let db_exists = std::path::Path::new(&db_path).exists();
    
    if !db_exists {
        return Ok(serde_json::json!({
            "exists": false,
            "is_empty": true
        }));
    }
    
    // Database exists, check if users table is empty
    match db::Database::init(&app_handle) {
        Ok(db) => {
            match db.is_users_empty() {
                Ok(is_empty) => Ok(serde_json::json!({
                    "exists": true,
                    "is_empty": is_empty
                })),
                Err(_) => Ok(serde_json::json!({
                    "exists": true,
                    "is_empty": true
                }))
            }
        }
        Err(_) => Ok(serde_json::json!({
            "exists": false,
            "is_empty": true
        }))
    }
}

/// Check if this is first run (no users in database) - legacy function
#[tauri::command]
async fn check_first_run(app_handle: tauri::AppHandle) -> Result<bool, String> {
    let db = db::Database::init(&app_handle)?;
    db.is_users_empty()
}

/// Initialize first superadmin_0 user
#[tauri::command]
async fn init_superadmin_0(
    app_handle: tauri::AppHandle,
    first_run_state: State<'_, FirstRunState>,
) -> Result<serde_json::Value, String> {
    let db = db::Database::init(&app_handle)?;
    
    // Check if users table is empty
    if !db.is_users_empty()? {
        return Err("Users already exist".to_string());
    }
    
    // Generate random password
    let password = db::Database::generate_random_password();
    
    // Create superadmin_0
    let user = db.create_superadmin_0(&password)?;
    
    // Store password in state
    first_run_state.set_password(password.clone());
    
    log::info!("Superadmin_0 created with username: {}", user.username);
    
    Ok(serde_json::json!({
        "username": user.username,
        "password": password
    }))
}

/// Get initial superadmin password (only works once)
#[tauri::command]
async fn get_initial_password(first_run_state: State<'_, FirstRunState>) -> Result<Option<String>, String> {
    Ok(first_run_state.get_and_clear_password())
}

/// Import database from file
#[tauri::command]
async fn import_database(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    use tauri_plugin_dialog::DialogExt;
    
    // Open file dialog to select database file
    let file_path = app_handle.dialog()
        .file()
        .add_filter("Database", &["db"])
        .blocking_pick_file();
    
    match file_path {
        Some(path) => {
            let source_path = path.as_path().unwrap();
            let target_path = db::Database::get_database_path(&app_handle)?;
            
            // Copy the selected database to the app data directory
            match std::fs::copy(&source_path, &target_path) {
                Ok(_) => {
                    log::info!("Database imported successfully from {:?}", source_path);
                    Ok(serde_json::json!({
                        "success": true,
                        "message": "Database berhasil diimport"
                    }))
                }
                Err(e) => {
                    log::error!("Failed to import database: {}", e);
                    Ok(serde_json::json!({
                        "success": false,
                        "error": format!("Gagal mengimport database: {}", e)
                    }))
                }
            }
        }
        None => {
            // User cancelled
            Ok(serde_json::json!({
                "success": false,
                "error": "Pemilihan file dibatalkan"
            }))
        }
    }
}

/// Login user
#[tauri::command]
async fn login(
    app_handle: tauri::AppHandle,
    sessions: State<'_, SessionStore>,
    username: String,
    password: String,
) -> Result<LoginResponse, String> {
    let db = db::Database::init(&app_handle)?;
    
    let result = db.login(&username, &password)?;
    
    if result.success {
        let user = result.user.unwrap();
        let token = sessions.create_session(user.id, user.username.clone(), user.role.clone());
        
        Ok(LoginResponse {
            success: true,
            token: Some(token),
            user: Some(user),
            message: result.message,
            must_change_password: result.must_change_password,
        })
    } else {
        Ok(LoginResponse {
            success: false,
            token: None,
            user: None,
            message: result.message,
            must_change_password: false,
        })
    }
}

/// Login response
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LoginResponse {
    pub success: bool,
    pub token: Option<String>,
    pub user: Option<db::User>,
    pub message: String,
    pub must_change_password: bool,
}

/// Logout user
#[tauri::command]
async fn logout(
    app_handle: tauri::AppHandle,
    sessions: State<'_, SessionStore>,
    token: String,
) -> Result<(), String> {
    if let Some(session) = sessions.get_session(&token) {
        let db = db::Database::init(&app_handle)?;
        db.logout(session.user_id)?;
    }
    
    sessions.remove_session(&token);
    Ok(())
}

/// Validate session
#[tauri::command]
async fn validate_session(
    sessions: State<'_, SessionStore>,
    token: String,
) -> Result<Option<db::Session>, String> {
    // Cleanup expired sessions periodically
    sessions.cleanup_expired();
    
    if sessions.is_valid(&token) {
        Ok(sessions.get_session(&token))
    } else {
        sessions.remove_session(&token);
        Ok(None)
    }
}

/// Get current user from token
#[tauri::command]
async fn get_current_user(
    app_handle: tauri::AppHandle,
    sessions: State<'_, SessionStore>,
    token: String,
) -> Result<Option<db::User>, String> {
    if !sessions.is_valid(&token) {
        return Ok(None);
    }
    
    if let Some(session) = sessions.get_session(&token) {
        let db = db::Database::init(&app_handle)?;
        db.get_user_by_id(session.user_id)
    } else {
        Ok(None)
    }
}

/// Change password
#[tauri::command]
async fn change_password(
    app_handle: tauri::AppHandle,
    sessions: State<'_, SessionStore>,
    token: String,
    oldPassword: Option<String>,
    newPassword: String,
    isFirstChange: bool,
) -> Result<Result<(), String>, String> {
    if !sessions.is_valid(&token) {
        return Ok(Err("Sesi tidak valid. Silakan login ulang.".to_string()));
    }
    
    let session = sessions.get_session(&token).unwrap();
    let db = db::Database::init(&app_handle)?;
    
    let old_pwd_ref = oldPassword.as_deref();
    db.change_password(session.user_id, old_pwd_ref, &newPassword, isFirstChange)
}

// ==================== USER MANAGEMENT COMMANDS ====================

/// Get all users (Superadmin only)
#[tauri::command]
async fn get_users(
    app_handle: tauri::AppHandle,
    sessions: State<'_, SessionStore>,
    token: String,
) -> Result<Result<Vec<db::User>, String>, String> {
    // Validate session and check role
    if !sessions.is_valid(&token) {
        return Ok(Err("Sesi tidak valid".to_string()));
    }
    
    let session = sessions.get_session(&token).unwrap();
    if session.role != "superadmin_0" && session.role != "superadmin" {
        return Ok(Err("Anda tidak memiliki akses".to_string()));
    }
    
    let db = db::Database::init(&app_handle)?;
    Ok(Ok(db.get_all_users()?))
}

/// Create new user (Superadmin only)
#[tauri::command]
async fn create_user(
    app_handle: tauri::AppHandle,
    sessions: State<'_, SessionStore>,
    token: String,
    user: db::CreateUserRequest,
) -> Result<Result<i64, String>, String> {
    // Validate session and check role
    if !sessions.is_valid(&token) {
        return Ok(Err("Sesi tidak valid".to_string()));
    }
    
    let session = sessions.get_session(&token).unwrap();
    if session.role != "superadmin_0" && session.role != "superadmin" {
        return Ok(Err("Anda tidak memiliki akses".to_string()));
    }
    
    let db = db::Database::init(&app_handle)?;
    Ok(Ok(db.create_user(&user, session.user_id)?))
}

/// Update user (Superadmin only)
#[tauri::command]
async fn update_user(
    app_handle: tauri::AppHandle,
    sessions: State<'_, SessionStore>,
    token: String,
    userId: i64,
    user: db::UpdateUserRequest,
) -> Result<Result<(), String>, String> {
    let user_id = userId;
    // Validate session and check role
    if !sessions.is_valid(&token) {
        return Ok(Err("Sesi tidak valid".to_string()));
    }
    
    let session = sessions.get_session(&token).unwrap();
    if session.role != "superadmin_0" && session.role != "superadmin" {
        return Ok(Err("Anda tidak memiliki akses".to_string()));
    }
    
    // Prevent updating superadmin_0 role
    let db = db::Database::init(&app_handle)?;
    if let Some(target_user) = db.get_user_by_id(user_id)? {
        if target_user.role == "superadmin_0" && user.role.is_some() {
            return Ok(Err("Role Superadmin_0 tidak dapat diubah".to_string()));
        }
    }
    
    Ok(Ok(db.update_user(user_id, &user, session.user_id)?))
}

/// Delete user (Superadmin only)
#[tauri::command]
async fn delete_user(
    app_handle: tauri::AppHandle,
    sessions: State<'_, SessionStore>,
    token: String,
    userId: i64,
) -> Result<Result<(), String>, String> {
    let user_id = userId;
    // Validate session and check role
    if !sessions.is_valid(&token) {
        return Ok(Err("Sesi tidak valid".to_string()));
    }
    
    let session = sessions.get_session(&token).unwrap();
    if session.role != "superadmin_0" && session.role != "superadmin" {
        return Ok(Err("Anda tidak memiliki akses".to_string()));
    }
    
    let db = db::Database::init(&app_handle)?;
    db.delete_user(user_id, session.user_id)
}

/// Reset user password (Superadmin only)
#[tauri::command]
async fn reset_user_password(
    app_handle: tauri::AppHandle,
    sessions: State<'_, SessionStore>,
    token: String,
    userId: i64,
    newPassword: String,
) -> Result<Result<(), String>, String> {
    let user_id = userId;
    let new_password = newPassword;
    // Validate session and check role
    if !sessions.is_valid(&token) {
        return Ok(Err("Sesi tidak valid".to_string()));
    }
    
    let session = sessions.get_session(&token).unwrap();
    if session.role != "superadmin_0" && session.role != "superadmin" {
        return Ok(Err("Anda tidak memiliki akses".to_string()));
    }
    
    let db = db::Database::init(&app_handle)?;
    Ok(Ok(db.reset_user_password(user_id, &new_password, session.user_id)?))
}

// ==================== AUDIT LOG COMMANDS ====================

/// Get audit logs (Superadmin only)
#[tauri::command]
async fn get_audit_logs(
    app_handle: tauri::AppHandle,
    sessions: State<'_, SessionStore>,
    token: String,
    limit: i64,
    offset: i64,
) -> Result<Result<Vec<db::AuditLog>, String>, String> {
    // Validate session and check role
    if !sessions.is_valid(&token) {
        return Ok(Err("Sesi tidak valid".to_string()));
    }
    
    let session = sessions.get_session(&token).unwrap();
    if session.role != "superadmin_0" && session.role != "superadmin" {
        return Ok(Err("Anda tidak memiliki akses".to_string()));
    }
    
    let db = db::Database::init(&app_handle)?;
    Ok(Ok(db.get_audit_logs(limit, offset)?))
}

/// Count audit logs
#[tauri::command]
async fn count_audit_logs(
    app_handle: tauri::AppHandle,
    sessions: State<'_, SessionStore>,
    token: String,
) -> Result<Result<i64, String>, String> {
    // Validate session and check role
    if !sessions.is_valid(&token) {
        return Ok(Err("Sesi tidak valid".to_string()));
    }
    
    let session = sessions.get_session(&token).unwrap();
    if session.role != "superadmin_0" && session.role != "superadmin" {
        return Ok(Err("Anda tidak memiliki akses".to_string()));
    }
    
    let db = db::Database::init(&app_handle)?;
    Ok(Ok(db.count_audit_logs()?))
}

/// Get logo file as base64 data URL
#[tauri::command]
async fn get_logo_data(
    app_handle: tauri::AppHandle,
) -> Result<Option<String>, String> {
    let db = db::Database::init(&app_handle)?;
    let settings = db.get_settings()?;
    
    if let Some(logo_path) = settings.logo_path {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {:?}", e))?;
        
        let full_path = app_data_dir.join(&logo_path);
        
        if full_path.exists() {
            let file_data = std::fs::read(&full_path)
                .map_err(|e| format!("Failed to read logo file: {}", e))?;
            
            // Detect mime type
            let ext = full_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("png");
            let mime_type = match ext.to_lowercase().as_str() {
                "jpg" | "jpeg" => "image/jpeg",
                "png" => "image/png",
                "gif" => "image/gif",
                _ => "image/png",
            };
            
            let base64_data = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &file_data);
            Ok(Some(format!("data:{};base64,{}", mime_type, base64_data)))
        } else {
            Ok(None)
        }
    } else {
        Ok(None)
    }
}

/// Setup handler - dijalankan saat aplikasi mulai
fn setup_handler(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Check if database file exists
    let db_path = match db::Database::get_database_path(&app.handle()) {
        Ok(path) => path,
        Err(e) => {
            log::error!("❌ Gagal mendapatkan path database: {}", e);
            return Ok(());
        }
    };
    
    let db_exists = std::path::Path::new(&db_path).exists();
    
    if !db_exists {
        log::info!("🆕 Database belum ada. Aplikasi akan menampilkan halaman first-run.");
        // Tidak membuat database otomatis - biarkan user pilih via first-run page
        return Ok(());
    }
    
    // Database exists, initialize it
    match db::initialize_database(&app.handle()) {
        Ok(database) => {
            // Verifikasi database
            match database.verify() {
                Ok(true) => {
                    log::info!("✅ Database berhasil diinisiasi dan terverifikasi");
                    
                    // Check if users table is empty
                    match database.is_users_empty() {
                        Ok(true) => {
                            log::info!("🆕 Database ada tapi users kosong. Aplikasi akan menampilkan halaman first-run.");
                            // Tidak auto-create superadmin - biarkan first-run page yang handle
                        }
                        Ok(false) => {
                            log::info!("👥 Users sudah ada dalam database");
                        }
                        Err(e) => {
                            log::warn!("⚠️ Gagal cek users table: {}", e);
                        }
                    }
                    
                    // Log statistik database
                    match database.get_stats() {
                        Ok(stats) => {
                            log::info!("📊 Statistik Database:");
                            log::info!("   - Total Graves: {}", stats.graves_count);
                            log::info!("   - Total Heirs: {}", stats.heirs_count);
                            log::info!("   - Total Payments: {}", stats.payments_count);
                            log::info!("   - Ukuran DB: {}", stats.formatted_size());
                        }
                        Err(e) => log::warn!("Gagal mendapatkan statistik database: {}", e),
                    }
                }
                Ok(false) => {
                    log::warn!("⚠️ Database terbuka tapi tabel tidak lengkap");
                }
                Err(e) => {
                    log::error!("❌ Gagal verifikasi database: {}", e);
                }
            }
        }
        Err(e) => {
            log::error!("❌ Gagal inisiasi database: {}", e);
            // Tidak panic - aplikasi tetap jalan tapi fitur DB tidak akan work
        }
    }
    
    Ok(())
}

/// Show first run dialog with superadmin password
#[cfg(not(test))]
fn show_first_run_dialog(app_handle: &tauri::AppHandle, password: &str) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_dialog::DialogExt;
    
    let password_clone = password.to_string();
    
    // Use dialog API to show message
    app_handle.dialog()
        .message(format!(
            "Selamat datang di Astana!\n\nSuperadmin telah dibuat otomatis.\n\nUsername: superadmin\nPassword: {}\n\nHarap simpan password ini dengan aman dan ganti setelah login pertama.",
            password_clone
        ))
        .title("Setup Awal - Superadmin")
        .show(|_| {});
    
    Ok(())
}

#[cfg(test)]
fn show_first_run_dialog(_app_handle: &tauri::AppHandle, _password: &str) -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger
    env_logger::init();

    // Create state for sessions and first run
    let session_store = SessionStore::new();
    let first_run_state = FirstRunState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .manage(session_store)
        .manage(first_run_state)
        .setup(setup_handler)
        .invoke_handler(tauri::generate_handler![
            // Authentication
            check_first_run,
            check_database_status,
            init_superadmin_0,
            get_initial_password,
            import_database,
            login,
            logout,
            validate_session,
            get_current_user,
            change_password,
            // User Management
            get_users,
            create_user,
            update_user,
            delete_user,
            reset_user_password,
            // Audit Log
            get_audit_logs,
            count_audit_logs,
            // Database
            get_database_path,
            get_database_stats,
            backup_database_with_dialog,
            restore_database_with_dialog,
            open_database_folder,
            // Blocks
            get_blocks,
            get_block_by_id,
            create_block,
            update_block,
            delete_block,
            get_block_stats,
            // Graves
            get_graves,
            count_graves,
            get_grave_by_id,
            create_grave_with_heirs,
            update_grave,
            delete_grave,
            get_grave_detail,
            export_graves,
            save_excel_file,
            // Heirs
            get_heirs_by_grave,
            create_heir,
            update_heir,
            delete_heir,
            update_grave_heirs,
            // Payments
            get_payments_by_grave,
            get_payment_by_grave_and_year,
            create_payment,
            update_payment,
            delete_payment,
            get_graves_with_payment_summary,
            // Dashboard
            get_dashboard_stats,
            get_recent_payments,
            get_recent_graves,
            get_financial_summary,
            get_days_since_backup,
            // Reports
            get_yearly_report,
            get_available_years,
            // Settings
            get_settings,
            update_settings,
            update_last_backup,
            upload_logo,
            get_logo_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
