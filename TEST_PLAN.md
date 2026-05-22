# 🧪 Astana - Comprehensive Testing Plan

## Status: ✅ SELESAI (Fase 1, 2, 3A, 3B, 3D) | Fase 3C (controllers) ⏳

## Overview

- **Backend (Rust)**: 78 tests (29 existing + 49 new) ✅ **ALL PASS**
- **Frontend (JS)**: 9 test files with ~52 tests ✅ **MockTauri covers 53 commands**
- **Coverage improvement**: Auth/user/audit (41% → 100%), Blocks/Graves/Heirs/Payments (0% → 90%+), Dashboard/Reports/Settings (0% → 100%)
- **Approach**: Rust `#[test]` (temp SQLite) + Mock Tauri (in-memory JS mock). No npm deps.
- **Fase 3**: E2E with Playwright + JS restructuring (for Vitest) selama refactor.

---

## ════════════════════════════════════════
## FASE 1: Backend Unit Tests (Rust)
## Target: ~49 new tests | ~1200 lines test code
## ════════════════════════════════════════

**File target:** `src-tauri/src/db.rs`

All tests follow the existing `create_test_db()` pattern (temp SQLite via `tempfile`).

### 1.1 Blocks CRUD (8 tests)

```
test_get_all_blocks_empty          Get blocks on empty DB returns []
test_get_all_blocks_with_data      Create 3 blocks, get_all returns 3 sorted by code
test_get_block_by_id_exists        Create block -> get by ID returns correct data
test_get_block_by_id_not_found     Get non-existent ID returns error
test_create_block_success          Create block with all fields
test_create_block_duplicate_code   Create block with same code -> error
test_update_block                  Create then update code/desc/status/fee
test_delete_block                  Create then delete, verify gone
```

### 1.2 Graves CRUD (10 tests)

```
test_get_graves_empty              Get graves on empty DB returns []
test_get_graves_with_data          Create 2 blocks + 5 graves, verify list + heirs
test_get_graves_pagination         Create 35 graves, verify pages
test_get_graves_search             Search by name returns filtered
test_get_graves_filter_by_block    Filter by block_id
test_create_grave_success          Create grave with all fields
test_get_grave_by_id               Verify grave detail + heirs
test_update_grave                  Update grave fields
test_delete_grave                  Delete grave, cascade deletes heirs
test_count_graves                  Count with optional block filter
```

### 1.3 Heirs CRUD (8 tests)

```
test_create_heir                   Create grave -> add heir
test_get_heirs_by_grave            Create 3 heirs, all returned
test_get_heir_by_id                Get single heir by ID
test_update_heir                   Update name/phone/relationship
test_delete_heir                   Delete single heir
test_delete_heirs_by_grave         Delete all heirs for a grave
test_cascade_delete_heirs          Delete grave -> heirs auto-deleted
```

### 1.4 Payments CRUD (8 tests)

```
test_create_payment_success        Create grave + payment
test_create_multi_payments         Multiple payments for different years
test_get_payments_by_grave         All payments for a grave sorted by year
test_get_payment_by_grave_and_year Specific year payment
test_get_payment_by_id             Get payment by ID
test_delete_payment                Delete payment
test_create_payment_invalid_grave  Non-existent grave -> error
test_duplicate_year_payment        Duplicate year -> error
```

### 1.5 Settings (3 tests)

```
test_get_settings_default          Fresh DB returns defaults
test_update_settings               Update fields -> verify persisted
test_update_last_backup            Update timestamp
```

### 1.6 Dashboard (4 tests)

```
test_get_dashboard_stats           Blocks + graves + payments -> verify counts
test_get_recent_payments           Create payments -> verify limited list
test_get_recent_graves             Create graves -> verify recent list
test_get_financial_summary         Payments for year -> verify total
```

### 1.7 Reports (5 tests)

```
test_get_yearly_report             Payments for 2025 -> verify aggregates
test_get_available_years           Payments across 2023-2025 -> verify years
test_get_grave_payment_detail      Detail for single grave+year
test_get_graves_payment_detail     All graves in a year
test_get_total_capacity            Blocks with capacity -> verify total
```

### 1.8 Backup/Restore (2 tests)

```
test_backup_database               Create data -> backup -> verify backup exists
test_restore_database              Backup -> restore -> verify data matches
```

### Verify Fase 1

```bash
cd src-tauri && cargo test
# Expected: ~78 tests (29 existing + 49 new), all PASS
```

---

## ═══════════════════════════════════════════
## FASE 2: Frontend Business Logic Tests (JS)
## Target: ~55 new tests | ~2000 lines test code
## ═══════════════════════════════════════════

### 2.0 Centralized Mock

**File baru:** `src/tests/mock-tauri.js`

Shared in-memory mock DB covering ALL Tauri commands:

```
Auth:     login, logout, validate_session, change_password, check_first_run, init_superadmin_0
Users:    get_users, create_user, update_user, delete_user, reset_user_password, get_current_user
Blocks:   get_blocks, get_block_by_id, create_block, update_block, delete_block, get_block_stats
Graves:   get_graves, count_graves, get_grave_by_id, create_grave_with_heirs, update_grave,
          delete_grave, update_grave_heirs, get_grave_detail, get_all_graves_with_heirs
Heirs:    get_heirs_by_grave, create_heir, update_heir, delete_heir, delete_heirs_by_grave
Payments: get_payments_by_grave, get_payment_by_grave_and_year, create_payment,
          create_multi_year_payments, delete_payment, get_grave_payment_detail,
          count_graves_with_payment_status, get_graves_with_payment_summary
Receipts: generate_single_receipt, generate_combined_receipt
Settings: get_settings, update_settings, get_logo_data, get_database_stats,
          get_database_path, update_last_backup
Dashboard: get_dashboard_stats, get_recent_payments, get_recent_graves, get_financial_summary,
           get_days_since_backup
Reports:  get_yearly_report, get_available_years, get_graves_payment_detail
Audit:    get_audit_logs, count_audit_logs
```

Mock state uses in-memory arrays with auto-increment IDs.

### 2.1 Block Tests — `src/tests/blok-tests.js` (8 tests)

| Test | What it validates |
|------|-------------------|
| `load_blocks_empty` | No blocks returns empty array |
| `load_blocks_with_data` | 3 blocks returned, sorted by code |
| `create_block_success` | Create -> appears in get_blocks |
| `create_block_validation` | Missing required fields -> error |
| `create_block_duplicate_code` | Duplicate code -> error |
| `update_block` | Update fields -> get_block_by_id confirms |
| `delete_block` | Delete -> removed from get_blocks |
| `get_block_stats` | Capacity/occupied for specific block |

### 2.2 Grave & Heir Tests — `src/tests/data-makam-tests.js` (12 tests)

| Test | What it validates |
|------|-------------------|
| `load_graves_empty` | No graves returns empty |
| `load_graves_with_data` | Graves + heirs returned with pagination |
| `load_graves_pagination` | Page 1 = 30 items, page 2 = remainder |
| `load_graves_search` | Search by name filters correctly |
| `load_graves_filter_by_block` | Filter by block_id |
| `create_grave_with_heirs` | Grave + 2 heirs created, verify detail |
| `update_grave` | Update name/dates/block |
| `delete_grave` | Delete -> heirs cascade deleted |
| `create_heir` | Add heir to existing grave |
| `update_heir` | Update heir details |
| `delete_heir` | Remove single heir |
| `get_blocks_for_dropdown` | Blocks loaded for form dropdown |

### 2.3 Payment Tests — `src/tests/pembayaran-tests.js` (10 tests)

| Test | What it validates |
|------|-------------------|
| `load_payments_empty` | No payments -> empty |
| `load_payments_for_grave` | Payments returned for specific grave |
| `create_single_payment` | One payment created |
| `create_multi_year_payment` | 3 years at once -> 3 records |
| `payment_already_exists` | Duplicate year -> error |
| `delete_payment` | Delete -> removed |
| `get_payment_history` | Multiple years sorted |
| `get_payment_by_year` | Filter by year |
| `download_single_receipt` | Receipt request returns PDF bytes |
| `download_combined_receipt` | Combined receipt returns PDF bytes |

### 2.4 Report Tests — `src/tests/laporan-tests.js` (6 tests)

| Test | What it validates |
|------|-------------------|
| `load_yearly_report` | Payments for 2025 -> aggregates correct |
| `load_available_years` | Multiple years returned |
| `load_report_no_data` | Year with no data -> empty/zeros |
| `grave_payment_detail` | Per-grave payment status |
| `block_breakdown` | Per-block statistics in report |
| `empty_database_report` | Fresh DB -> zeros |

### 2.5 Settings Tests — `src/tests/pengaturan-tests.js` (5 tests)

| Test | What it validates |
|------|-------------------|
| `load_settings` | Default settings returned |
| `update_settings` | Foundation info updated |
| `get_database_stats` | DB file size/stats |
| `get_database_path` | DB path returned |
| `get_logo_data` | Null when unset, base64 when set |

### 2.6 User Management Tests — `src/tests/pengguna-tests.js` (8 tests)

| Test | What it validates |
|------|-------------------|
| `load_users` | All users (includes default superadmin) |
| `create_user` | Create admin -> appears in list |
| `create_user_duplicate` | Duplicate username -> error |
| `create_user_validation` | Missing fields -> error |
| `update_user` | Update username/role |
| `delete_user` | Delete non-superadmin0 user |
| `cannot_delete_superadmin0` | Delete superadmin_0 -> error |
| `reset_password` | Reset -> new password generated |

### 2.7 Audit Log Tests — `src/tests/audit-log-tests.js` (6 tests)

| Test | What it validates |
|------|-------------------|
| `load_audit_logs_empty` | No logs -> empty |
| `load_audit_logs_with_data` | Create logs, paginated list returned |
| `audit_log_pagination` | Page 1 count, page 2 remainder |
| `audit_log_filter` | Filter by user_id or action |
| `count_audit_logs` | Total count correct |
| `audit_auto_logging` | Creating user auto-generates audit log |

### 2.8 Update Test Runner — `src/tests/test-runner.html`

- Load `mock-tauri.js` first (shared mock)
- Load all individual test files
- Tab/selector UI to run per-module or all at once
- Show pass/fail summary per module

### 2.9 Refactor Existing Tests — `src/tests/auth-ui-tests.js`

- Remove inline mock, import from `mock-tauri.js` instead

### Verify Fase 2

Open `src/tests/test-runner.html` in browser, click "Run All Tests".
Expected: ~63 tests (8 auth + 55 new), all PASS.

---

## ═══════════════════════════════════════════
## FASE 3 (AKTIF): Refactor Rust Backend — Service & Controller Pattern
## ═══════════════════════════════════════════

### Analisis Kesenjangan

Sebagian besar test saat ini hanya menguji `happy path`. Berikut negative test yang masih kurang:

### 2.10.1 Blok Tests — tambah ke `blok-tests.js`

| Test | Validasi |
|------|----------|
| `Create block with empty code fails` | `code: ""` → error |
| `Create block with single-char code` | `code: "A"` → sukses (valid) atau error tergantung aturan |
| `Create block with negative capacity` | `total_capacity: -1` → error atau di-clamp ke 0 |
| `Update block non-existent` | `id: 9999` → error |
| `Delete block non-existent` | `id: 9999` → error |

### 2.10.2 Data Makam Tests — tambah ke `data-makam-tests.js`

| Test | Validasi |
|------|----------|
| `Create grave with empty name fails` | `deceased_name: ""` → error |
| `Create grave with 1-char name` | `deceased_name: "A"` → validasi panjang minimal |
| `Create grave with invalid block_id` | `block_id: 9999` → error (FK violation) |
| `Create grave with empty number` | `number: ""` → error |
| `Update grave non-existent` | `id: 9999` → error |
| `Delete grave non-existent` | `id: 9999` → error |

### 2.10.3 Pembayaran Tests — tambah ke `pembayaran-tests.js`

| Test | Validasi |
|------|----------|
| `Create payment with zero amount` | `amount: 0` → mungkin valid, perlu dikonfirmasi |
| `Create payment with negative amount` | `amount: -50000` → error |
| `Create payment with invalid grave_id` | `grave_id: 9999` → error (FK violation) |
| `Create payment with invalid year` | `year: 1800` → error atau warning |
| `Delete payment non-existent` | `id: 9999` → error |

### 2.10.4 Pengguna Tests — tambah ke `pengguna-tests.js`

| Test | Validasi |
|------|----------|
| `Create user with 1-char username` | `username: "ab"` → error (min 3) |
| `Create user with empty password` | `password: ""` → error |
| `Create user with invalid role` | `role: "hacker"` → error |
| `Update user non-existent` | `user_id: 9999` → error |
| `Delete user non-existent` | `user_id: 9999` → error |
| `Get users without session` | tanpa `token` → error |

### 2.10.5 Laporan Tests — tambah ke `laporan-tests.js`

| Test | Validasi |
|------|----------|
| `Yearly report with negative year` | `year: -1` → mungkin return data kosong atau error |

### 2.10.6 Rust Backend — negative tests sudah memadai

Rust sudah mencakup:
- ✅ Get by non-existent ID (block, grave, heir, payment)
- ✅ Duplicate block code
- ✅ Delete block with graves (FK violation)
- ✅ Duplicate year payment (UNIQUE constraint)

### Verify Fase 2.10

```bash
cd src-tauri && cargo test    # Rust: tetap 78 tests
# JS: ~74 tests (52 existing + 22 negative baru)
# Buka src/tests/test-runner.html di browser
```

---

Memecah `db.rs` (4813 baris) dan `lib.rs` (2847 baris) menjadi struktur modular.

### 3.1 Target Struktur

```
src-tauri/src/
├── models/                    ← Struct definitions (zero business logic)
│   ├── mod.rs
│   ├── block.rs               Block, CreateBlockRequest, UpdateBlockRequest, BlockStats
│   ├── grave.rs               Grave, GraveWithBlock, CreateGraveRequest, UpdateGraveRequest, GraveExportData
│   ├── heir.rs                Heir, CreateHeirRequest, UpdateHeirRequest
│   ├── payment.rs             Payment, CreatePaymentRequest
│   ├── settings.rs            Settings, UpdateSettingsRequest
│   ├── dashboard.rs           DashboardStats, RecentPayment, RecentGrave, FinancialSummary, DatabaseStats
│   ├── report.rs              YearlyReport, BlockReport, GravePaymentDetail, PaymentStatus, GravePaymentDetailWithHeir
│   ├── user.rs                User, UserWithHash, CreateUserRequest, UpdateUserRequest, LoginResult, Session
│   └── audit.rs               AuditLog
│
├── services/                  ← impl Database (business logic / query methods)
│   ├── mod.rs
│   ├── block_service.rs       (6 methods)  ~150 baris
│   ├── grave_service.rs       (7 methods)  ~330 baris
│   ├── heir_service.rs        (6 methods)  ~120 baris
│   ├── payment_service.rs     (6 methods)  ~160 baris
│   ├── settings_service.rs    (3 methods)  ~60 baris
│   ├── dashboard_service.rs   (5 methods)  ~210 baris
│   ├── report_service.rs      (5 methods)  ~290 baris
│   ├── auth_service.rs        (16 methods) ~580 baris
│   ├── audit_service.rs       (3 methods)  ~75 baris
│   └── backup_service.rs      (2 methods)  ~35 baris
│
├── controllers/               ← #[tauri::command] (request handling + response)
│   ├── mod.rs
│   ├── block_controller.rs    (6 commands)  ~140 baris
│   ├── grave_controller.rs    (9 commands)  ~280 baris
│   ├── heir_controller.rs     (6 commands)  ~90 baris
│   ├── payment_controller.rs  (10 commands) ~400 baris
│   ├── receipt_controller.rs  (2 commands)  ~200 baris
│   ├── dashboard_controller.rs(5 commands)  ~50 baris
│   ├── report_controller.rs   (3 commands)  ~350 baris
│   ├── settings_controller.rs (6 commands)  ~170 baris
│   ├── auth_controller.rs     (7 commands)  ~180 baris
│   ├── user_controller.rs     (5 commands)  ~190 baris
│   ├── audit_controller.rs    (2 commands)  ~45 baris
│   ├── system_controller.rs   (5 commands)  ~130 baris
│   └── file_controller.rs     (3 commands)  ~80 baris
│
├── state.rs                   ← SessionStore + FirstRunState (dipisah dari lib.rs)
│
├── db.rs                      ← Database struct + init/connection/migrations + re-export
├── lib.rs                     ← setup_handler + run() + pub mod declarations
├── main.rs                    ← no change
├── utils.rs                   ← no change
└── pdf_receipt.rs             ← no change
```

### 3.2 Prinsip: Zero Impact ke Frontend

Frontend JS memanggil Tauri commands via IPC dengan **string command name**:
```js
window.__TAURI__.core.invoke('get_blocks');  // ← tidak berubah
```
Selama command name tetap sama (nama function Rust tidak berubah), frontend tidak perlu diubah.
Mock Tauri di `mock-tauri.js` juga tetap valid karena mensimulasi IPC yang sama.

### 3.3 Eksekusi

| Step | Action | Verify |
|------|--------|--------|
| A.1 | Buat `models/` — 9 file struct | `cargo check` |
| A.2 | Update `db.rs` — tambah re-export, hapus struct asli | `cargo test` → 78 pass |
| B.1 | `services/` — 10 file `impl Database` | `cargo test` → 78 pass |
| B.2 | Hapus `impl Database` lama dari `db.rs` | `cargo test` → 78 pass |
| C.1 | `state.rs` — SessionStore + FirstRunState | `cargo check` |
| C.2 | `controllers/` — 13 file | `cargo test` → 78 pass |
| C.3 | Hapus command dari `lib.rs` | `cargo test` → 78 pass |
| D.1 | `tests/` — pindah test ke file terpisah | `cargo test` → 78 pass |
| D.2 | Hapus `#[cfg(test)]` dari `db.rs` | `cargo test` → 78 pass |

### 3.4 Hasil Akhir

| File | Sebelum | Sesudah |
|------|---------|---------|
| `db.rs` | 4813 baris | ~200 baris (struct + init + re-export) |
| `lib.rs` | 2847 baris | ~100 baris (setup + run + pub mod) |
| `models/` | — | 9 file, ~430 baris |
| `services/` | — | 10 file, ~2000 baris |
| `controllers/` | — | 13 file, ~2300 baris |
| `state.rs` | inline di lib.rs | ~60 baris |
| `tests/` | inline di db.rs | ~1200 baris terpisah |

---

## ═══════════════════════════════════════════
## Execution Order
## ═══════════════════════════════════════════

| Step | Action | Status |
|------|--------|--------|
| 1.1 | Block CRUD tests (8) | ✅ |
| 1.2 | Graves CRUD tests (10) | ✅ |
| 1.3 | Heirs CRUD tests (7) | ✅ |
| 1.4 | Payments CRUD tests (7) | ✅ |
| 1.5 | Settings tests (3) | ✅ |
| 1.6 | Dashboard tests (5) | ✅ |
| 1.7 | Reports tests (6) | ✅ |
| 1.8 | Backup/restore tests (2) | ✅ |
| 2.0 | `src/tests/mock-tauri.js` — 53 commands | ✅ |
| 2.1 | `src/tests/blok-tests.js` (7 tests) | ✅ |
| 2.2 | `src/tests/data-makam-tests.js` (10 tests) | ✅ |
| 2.3 | `src/tests/pembayaran-tests.js` (9 tests) | ✅ |
| 2.4 | `src/tests/laporan-tests.js` (6 tests) | ✅ |
| 2.5 | `src/tests/pengaturan-tests.js` (6 tests) | ✅ |
| 2.6 | `src/tests/pengguna-tests.js` (8 tests) | ✅ |
| 2.7 | `src/tests/audit-log-tests.js` (6 tests) | ✅ |
| 2.8 | `src/tests/test-runner.html` — Updated | ✅ |
| 2.9 | `src/tests/auth-ui-tests.js` — Refactored | ✅ |
| 2.10.1 | `blok-tests.js` — Negative tests (5) | ✅ |
| 2.10.2 | `data-makam-tests.js` — Negative tests (6) | ✅ |
| 2.10.3 | `pembayaran-tests.js` — Negative tests (5) | ✅ |
| 2.10.4 | `pengguna-tests.js` — Negative tests (6) | ✅ |
| 2.10.5 | `laporan-tests.js` — Negative tests (1) | ✅ |
| A.1 | `models/` — 9 file struct | ✅ |
| A.2 | `db.rs` — tambah re-export, hapus struct asli | ✅ |
| B.1 | `services/` — 10 file `impl Database` | ✅ |
| B.2 | Hapus `impl Database` lama dari `db.rs` | ✅ |
| C.0 | `state.rs` — SessionStore + FirstRunState | ✅ |
| C.1 | `controllers/` — 13 file (bisa dikerjakan nanti) | ⏳ FUTURE |
| D.1 | `tests.rs` — extract from db.rs | ✅ |
| **Total** | **~81 JS tests + 78 Rust tests** | **✅ FASE 1-3 SELESAI** |

---

## File Structure (Final)

```
src-tauri/src/
├── models/                     # 9 file struct (Block, Grave, Heir, Payment, Settings, Dashboard, Report, User, Audit)
├── services/                   # 10 file impl Database
│   ├── backup_service.rs       block_service.rs      grave_service.rs
│   ├── heir_service.rs         payment_service.rs    settings_service.rs
│   ├── dashboard_service.rs    report_service.rs     auth_service.rs
│   └── audit_service.rs
├── state.rs                    # SessionStore + FirstRunState
├── tests.rs                    # 78 DB tests + 3 PDF tests → ALL PASS
├── controllers/                # ⏳ FUTURE (70 Tauri commands masih di lib.rs)
├── db.rs                       # HANYA Database struct + init + re-export (331 baris)
├── lib.rs                      # ~2643 baris (70 Tauri commands + run/setup — blm di-split)
├── main.rs utils.rs pdf_receipt.rs
│
src/tests/                      # Frontend JS tests (~81 tests)
```

## Verification (Final)

```bash
cd src-tauri && cargo test    # 78 tests, ALL PASS ✅ (backend)
# Buka src/tests/test-runner.html di browser → ~81 tests (frontend)
```

### Apa yang Tersisa (Fase 3C: Controllers)

`lib.rs` masih ~2643 baris dengan 70 Tauri command yang bisa di-split ke `controllers/`:

| Controller | Commands |
|------------|----------|
| `app_controller` | get_app_version |
| `auth_controller` | check_database_status, check_first_run, init_superadmin_0, get_initial_password, import_database, login, logout, validate_session, get_current_user, change_password |
| `user_controller` | get_users, create_user, update_user, delete_user, reset_user_password |
| `audit_controller` | get_audit_logs, count_audit_logs |
| `system_controller` | get_database_path, get_database_stats, backup_database_with_dialog, restore_database_with_dialog, open_database_folder |
| `block_controller` | get_blocks, get_block_by_id, create_block, update_block, delete_block, get_block_stats |
| `grave_controller` | get_graves, count_graves, get_grave_by_id, create_grave_with_heirs, update_grave, delete_grave, get_grave_detail, export_graves, save_excel_file |
| `heir_controller` | get_heirs_by_grave, create_heir, update_heir, delete_heir, delete_heirs_by_grave, update_grave_heirs |
| `payment_controller` | get_payments_by_grave, get_payment_by_grave_and_year, create_payment, update_payment, delete_payment, get_graves_with_payment_summary, count_graves_with_payment_status, get_grave_payment_detail, create_multi_year_payments, generate_single_receipt, generate_combined_receipt |
| `dashboard_controller` | get_dashboard_stats, get_recent_payments, get_recent_graves, get_financial_summary, get_days_since_backup |
| `report_controller` | get_yearly_report, get_available_years, generate_pdf_report |
| `settings_controller` | get_settings, update_settings, update_last_backup, upload_logo, get_logo_data, upload_payment_proof, get_payment_proof_data |
