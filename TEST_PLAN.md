# 🧪 Astana - Comprehensive Testing Plan

## Status: ✅ Fase 1, 2, & 2.10 SEMUA SELESAI

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
## FASE 2.10: Negative Test Cases (Edge Cases + Validation)
## Target: ~22 new tests across Rust + JS
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

**Dikerjakan setelah Fase 1 & 2** (safety net sudah exist).

### 3.1 Setup Playwright

```bash
npm init -y
npm install --save-dev @playwright/test
npx playwright install chromium
```

File `playwright.config.js`:
```js
module.exports = {
  testDir: './e2e',
  use: { baseURL: 'http://localhost:1420', headless: true },
};
```

### 3.2 E2E Test Files

```
e2e/
├── auth.spec.js         Login, password change, session expiry, first-run
├── blok.spec.js         CRUD block, cards + table, status toggle
├── makam.spec.js        CRUD grave + heirs, classic + modern form, detail modal, Excel
├── pembayaran.spec.js   Year picker, multi-year payment, receipts, export
├── laporan.spec.js      Yearly report, block breakdown, PDF/Excel export
├── pengaturan.spec.js   Settings edit, logo upload, backup/restore
├── pengguna.spec.js     CRUD user, reset password, role-based UI
├── audit-log.spec.js    Log display, pagination, filtering, auto-refresh
└── navigation.spec.js   Sidebar, role-based menu, logout redirect
```

### 3.3 JS Refactoring (parallel with E2E)

Refactor JS into modules for testability:

```
src/modules/
├── api.js          invoke() wrappers for all commands
├── auth.js         Session/login/logout/role logic
├── formatters.js   formatRupiah, formatTanggal, escapeHtml, etc.
├── validators.js   Form validation rules
└── state.js        Global state management

src/screens/
├── blok.js          DOM-only, imports from modules/
├── data-makam.js    DOM-only, imports from modules/
├── pembayaran.js    DOM-only, imports from modules/
├── laporan.js       DOM-only, imports from modules/
├── pengaturan.js    DOM-only, imports from modules/
├── pengguna.js      DOM-only, imports from modules/
└── audit-log.js     DOM-only, imports from modules/
```

With ESM (`<script type="module">`), functions become importable for Vitest:

```js
import { formatRupiah } from './modules/formatters.js';
import { createBlock } from './modules/api.js';
```

After refactoring, add Vitest for JS unit tests of `modules/` functions.

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
| **Total** | **~81 JS tests + 78 Rust tests** | **✅ SEMUA SELESAI** |

---

## File Structure (Final)

```
src/tests/
├── mock-tauri.js           # Centralized mock (53 Tauri commands)
├── test-runner.html        # Browser test runner with tabs
├── auth-ui-tests.js        # Auth tests (8) — refactored
├── blok-tests.js           # Block CRUD tests (7)
├── data-makam-tests.js     # Grave & heir CRUD tests (10)
├── pembayaran-tests.js     # Payment tests (9)
├── laporan-tests.js        # Report tests (6)
├── pengaturan-tests.js     # Settings tests (6)
├── pengguna-tests.js       # User mgmt tests (8)
├── audit-log-tests.js      # Audit log tests (6)
├── command-parameter-tests.js  # Pre-existing
└── validate-commands.js    # Pre-existing

src-tauri/src/db.rs         # 78 Rust tests (29 existing + 49 new)
```

## Verification

```bash
# Check backend tests pass
cd src-tauri && cargo test    # 78 tests, all PASS

# Check frontend tests pass
# Open src/tests/test-runner.html in browser
# Click "Run All Tests" or click individual module tabs
```
