// Astana - Manajemen Iuran Makam
// Library utama untuk aplikasi Tauri



// Modul database
pub mod db;

/// Command untuk greeting (contoh)
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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

/// Command untuk backup database
#[tauri::command]
async fn backup_database(app_handle: tauri::AppHandle, backup_path: String) -> Result<(), String> {
    db::backup_database_command(app_handle, backup_path)
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
    id: i64,
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

/// Setup handler - dijalankan saat aplikasi mulai
fn setup_handler(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Inisiasi database
    match db::initialize_database(&app.handle()) {
        Ok(database) => {
            // Verifikasi database
            match database.verify() {
                Ok(true) => {
                    log::info!("✅ Database berhasil diinisiasi dan terverifikasi");
                    
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger
    env_logger::init();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .setup(setup_handler)
        .invoke_handler(tauri::generate_handler![
            greet,
            get_database_path,
            get_database_stats,
            backup_database,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
