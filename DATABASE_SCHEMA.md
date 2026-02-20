# 📊 Database Schema - Astana

Dokumentasi lengkap skema database SQLite untuk Astana (Grave Management System).

---

## 📁 Lokasi Database

| Platform | Path |
|----------|------|
| Windows | `%LOCALAPPDATA%\com.perogeremmer.astana\astana.db` |
| macOS | `~/Library/Application Support/com.perogeremmer.astana/astana.db` |
| Linux | `~/.local/share/com.perogeremmer.astana/astana.db` |

---

## 📋 Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     blocks      │◄────│     graves      │◄────│     heirs       │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ PK id           │     │ PK id           │     │ PK id           │
│ UK code         │     │ FK block_id     │     │ FK grave_id     │
│    description  │     │    deceased_name│     │    order_number │
│    total_capacity│    │    number       │     │    full_name    │
│    annual_fee   │     │    date_of_death│     │    phone_number │
│    status       │     │    burial_date  │     │    relationship │
│    timestamps   │     │    notes        │     │    address      │
└─────────────────┘     │    timestamps   │     │    is_primary   │
         ▲              └───────┬─────────┘     │    timestamps   │
         │                      │               └─────────────────┘
         │              ┌───────┴─────────┐
         │              │    payments     │
         │              ├─────────────────┤
         └──────────────│ FK grave_id     │
                        │ UK year         │
                        │    payment_date │
                        │    amount       │
                        │    payment_proof│
                        │    paid_by      │
                        │    timestamps   │
                        └─────────────────┘

┌─────────────────┐
│    settings     │ (Single Row)
├─────────────────┤
│ PK id (fixed=1) │
│    foundation_name
│    address      │
│    phone        │
│    email        │
│    logo_path    │
│    active_year  │
│    timestamps   │
└─────────────────┘
```

---

## 🏛️ Tabel: `blocks`

Menyimpan data blok makam dan tarif iuran tahunan.

| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PK, AUTOINCREMENT | ID unik |
| `code` | TEXT | NOT NULL, UNIQUE | Kode blok (A, B, C, ...) |
| `description` | TEXT | - | Deskripsi lokasi/fasilitas |
| `total_capacity` | INTEGER | NOT NULL, DEFAULT 0 | Jumlah maksimal makam |
| `annual_fee` | INTEGER | NOT NULL, DEFAULT 0 | Iuran tahunan per makam (Rp) |
| `status` | TEXT | NOT NULL, DEFAULT 'active' | active/inactive |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu dibuat |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu diupdate |

### Contoh Query

```sql
-- Get all active blocks
SELECT * FROM blocks WHERE status = 'active';

-- Count graves per block
SELECT 
    b.code,
    b.total_capacity,
    COUNT(g.id) as occupied,
    (b.total_capacity - COUNT(g.id)) as available
FROM blocks b
LEFT JOIN graves g ON b.id = g.block_id
WHERE b.status = 'active'
GROUP BY b.id;
```

---

## ⚰️ Tabel: `graves`

Menyimpan data almarhum.

| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PK, AUTOINCREMENT | ID unik |
| `deceased_name` | TEXT | NOT NULL | Nama lengkap almarhum |
| `block_id` | INTEGER | NOT NULL, FK → blocks(id) | Referensi ke blok |
| `number` | TEXT | NOT NULL | Nomor makam (12, 05A, ...) |
| `date_of_death` | DATE | NOT NULL | Tanggal wafat (YYYY-MM-DD) |
| `burial_date` | DATE | - | Tanggal dimakamkan |
| `notes` | TEXT | - | Catatan tambahan |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu dibuat |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu diupdate |

### Constraints

- **UNIQUE(block_id, number)**: Tidak boleh ada nomor makam duplikat dalam satu blok

### Contoh Query

```sql
-- Search by name
SELECT * FROM graves WHERE deceased_name LIKE '%Ahmad%';

-- Get graves with block info
SELECT 
    g.id,
    g.deceased_name,
    g.number,
    b.code as block_code,
    g.date_of_death
FROM graves g
JOIN blocks b ON g.block_id = b.id
ORDER BY b.code, g.number;
```

---

## 👨‍👩‍👧 Tabel: `heirs`

Menyimpan data ahli waris (1-3 orang per makam).

| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PK, AUTOINCREMENT | ID unik |
| `grave_id` | INTEGER | NOT NULL, FK → graves(id) | Referensi ke makam |
| `order_number` | INTEGER | NOT NULL, DEFAULT 1 | Urutan (1, 2, 3) |
| `full_name` | TEXT | NOT NULL | Nama lengkap ahli waris |
| `phone_number` | TEXT | - | Nomor telepon/WhatsApp |
| `relationship` | TEXT | - | child, spouse, grandchild, sibling, other |
| `address` | TEXT | - | Alamat lengkap |
| `is_primary` | BOOLEAN | DEFAULT 0 | 1 = ahli waris utama |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu dibuat |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu diupdate |

### Constraints

- **UNIQUE(grave_id, order_number)**: Maksimal 1 ahli waris per urutan
- **ON DELETE CASCADE**: Hapus ahli waris saat makam dihapus

### Contoh Query

```sql
-- Get heirs for a grave
SELECT 
    g.deceased_name,
    h.full_name,
    h.relationship,
    h.phone_number
FROM heirs h
JOIN graves g ON h.grave_id = g.id
WHERE g.id = 1
ORDER BY h.order_number;

-- Search graves by heir name
SELECT DISTINCT g.*, b.code as block_code
FROM graves g
JOIN heirs h ON g.id = h.grave_id
JOIN blocks b ON g.block_id = b.id
WHERE h.full_name LIKE '%Budi%';
```

---

## 💰 Tabel: `payments`

Menyimpan historis pembayaran iuran tahunan.

| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PK, AUTOINCREMENT | ID unik |
| `grave_id` | INTEGER | NOT NULL, FK → graves(id) | Referensi ke makam |
| `year` | INTEGER | NOT NULL | Tahun pembayaran |
| `payment_date` | DATE | NOT NULL | Tanggal pembayaran |
| `amount` | INTEGER | NOT NULL | Jumlah pembayaran |
| `payment_method` | TEXT | DEFAULT 'cash' | cash, transfer, qris, etc. |
| `payment_proof` | TEXT | - | Path file bukti pembayaran |
| `paid_by` | TEXT | - | Nama pembayar (jika beda dari ahli waris) |
| `notes` | TEXT | - | Catatan pembayaran |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu dibuat |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu diupdate |

### Constraints

- **UNIQUE(grave_id, year)**: Satu pembayaran per tahun per makam

### Contoh Query

```sql
-- Check payment status by year
SELECT 
    g.deceased_name,
    b.code,
    CASE 
        WHEN p.id IS NOT NULL THEN 'Paid'
        ELSE 'Unpaid'
    END as status_2026
FROM graves g
JOIN blocks b ON g.block_id = b.id
LEFT JOIN payments p ON g.id = p.grave_id AND p.year = 2026;

-- Total revenue by year
SELECT 
    year,
    COUNT(*) as payer_count,
    SUM(amount) as total_revenue
FROM payments
GROUP BY year
ORDER BY year DESC;
```

---

## ⚙️ Tabel: `settings`

Menyimpan konfigurasi aplikasi (single row table).

| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PK, CHECK (id = 1) | Fixed ID = 1 |
| `foundation_name` | TEXT | NOT NULL, DEFAULT | Nama yayasan/makam |
| `address` | TEXT | - | Alamat lengkap |
| `phone` | TEXT | - | Nomor telepon |
| `email` | TEXT | - | Email yayasan |
| `logo_path` | TEXT | - | Path file logo |
| `active_year` | INTEGER | DEFAULT CURRENT_YEAR | Tahun aktif aplikasi |
| `last_backup` | TIMESTAMP | - | Waktu backup terakhir |
| `auto_backup` | INTEGER | DEFAULT 1 | 0=off, 1=on |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu dibuat |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu diupdate |

### Contoh Query

```sql
-- Get settings
SELECT * FROM settings WHERE id = 1;

-- Update active year
UPDATE settings SET active_year = 2027 WHERE id = 1;
```

---

## 🔍 Indexes

Index yang dibuat untuk optimasi query:

```sql
-- Grave indexes
CREATE INDEX idx_graves_block_id ON graves(block_id);
CREATE INDEX idx_graves_deceased_name ON graves(deceased_name);
CREATE INDEX idx_graves_number ON graves(number);
CREATE INDEX idx_graves_date_of_death ON graves(date_of_death);
CREATE INDEX idx_graves_burial_date ON graves(burial_date);
CREATE INDEX idx_graves_block_number ON graves(block_id, number);

-- Heir indexes
CREATE INDEX idx_heirs_grave_id ON heirs(grave_id);
CREATE INDEX idx_heirs_full_name ON heirs(full_name);
CREATE INDEX idx_heirs_phone ON heirs(phone_number);

-- Payment indexes
CREATE INDEX idx_payments_grave_id ON payments(grave_id);
CREATE INDEX idx_payments_year ON payments(year);
CREATE INDEX idx_payments_grave_year ON payments(grave_id, year);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payments_year_date ON payments(year, payment_date);
```

---

## 🔄 Triggers

Auto-update timestamp saat record diupdate:

```sql
-- Blocks trigger
CREATE TRIGGER update_blocks_timestamp 
AFTER UPDATE ON blocks
BEGIN
    UPDATE blocks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Similar triggers exist for: graves, heirs, payments, settings
```

---

## 🛠️ Backup & Restore

### Manual Backup (via SQL)

```bash
# Using SQLite CLI
sqlite3 astana.db ".backup backup_20250220.db"
```

### Backup via Rust Code

```rust
use astana_lib::db::Database;

let db = Database::init(&app_handle)?;
db.backup_to(PathBuf::from("backup/astana_2024.db"))?;
```

### Restore Database

1. Tutup aplikasi
2. Ganti file `astana.db` dengan file backup
3. Buka aplikasi kembali

---

## 📝 Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-20 | Initial schema with 5 tables (English naming) |
| 1.0.1 | 2026-02-20 | Added indexes for dates and grave numbers |

---

## 📊 Performance Tips

### Optimized Queries

```sql
-- ✅ Use index: idx_graves_date_of_death
SELECT * FROM graves 
WHERE date_of_death BETWEEN '2020-01-01' AND '2020-12-31';

-- ✅ Use index: idx_graves_number
SELECT * FROM graves WHERE number = '12A';

-- ✅ Use composite index: idx_graves_block_number
SELECT * FROM graves 
WHERE block_id = 1 AND number = '12A';

-- ✅ Use index: idx_payments_year_date
SELECT * FROM payments 
WHERE year = 2024 AND payment_date >= '2024-01-01';
```

### Query Patterns to Avoid

```sql
-- ❌ Avoid: Function on indexed column
SELECT * FROM graves WHERE YEAR(date_of_death) = 2020;
-- ✅ Better:
SELECT * FROM graves WHERE date_of_death BETWEEN '2020-01-01' AND '2020-12-31';
```
