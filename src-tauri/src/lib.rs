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
            // Heirs
            get_heirs_by_grave,
            create_heir,
            update_heir,
            delete_heir,
            update_grave_heirs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
