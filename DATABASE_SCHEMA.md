# 📊 Database Schema - Astana (Grave Management System)

English documentation for Astana SQLite database structure.

## 📁 Database File Location

| Platform | Location |
|----------|----------|
| Windows | `%LOCALAPPDATA%\com.perogeremmer.astana\astana.db` |
| macOS | `~/Library/Application Support/com.perogeremmer.astana/astana.db` |
| Linux | `~/.local/share/com.perogeremmer.astana/astana.db` |

## 📋 Table List

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     blocks      │◄────│     graves      │◄────│     heirs       │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ PK id           │     │ PK id           │     │ PK id           │
│ UK code         │     │ FK block_id     │     │ FK grave_id     │
│    description  │     │    deceased_name│     │    order_number │
│    total_capacity│    │    grave_number │     │    full_name    │
│    annual_fee   │     │    date_of_death│     │    phone_number │
│    status       │     │    burial_date  │     │    relationship │
│    timestamps   │     │    timestamps   │     │    address      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         ▲                      ▲
         │                      │
         │              ┌─────────────────┐
         │              │    payments     │
         │              ├─────────────────┤
         └──────────────│ FK grave_id     │
                        │ UK year         │
                        │    payment_date │
                        │    amount       │
                        │    payment_proof│
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

## 🏛️ Table: `blocks`

Stores grave block data and annual fee rates.

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique ID |
| `code` | TEXT | NOT NULL, UNIQUE | Block code (A, B, C, D, E, ...) |
| `description` | TEXT | - | Location/facility description |
| `total_capacity` | INTEGER | NOT NULL, DEFAULT 0 | Maximum graves in block |
| `annual_fee` | INTEGER | NOT NULL, DEFAULT 0 | Annual fee per grave (Rupiah) |
| `status` | TEXT | NOT NULL, DEFAULT 'active' | active/inactive |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update time |

### Default Data

Tidak ada data default. Blok ditambahkan melalui aplikasi.

### Example Queries

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

## ⚰️ Table: `graves`

Stores deceased person data.

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique ID |
| `deceased_name` | TEXT | NOT NULL | Full name of deceased |
| `block_id` | INTEGER | NOT NULL, FK → blocks(id) | Reference to block |
| `number` | TEXT | NOT NULL | Grave number (12, 05A, etc.) |
| `date_of_death` | DATE | NOT NULL | Date of death (YYYY-MM-DD) |
| `burial_date` | DATE | - | Burial date |
| `burial_date` | DATE | - | Burial date |
| `notes` | TEXT | - | Additional notes |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update time |

### Constraints

- **UNIQUE(block_id, grave_number)**: No duplicate grave numbers in one block

### Example Queries

```sql
-- Search deceased by name
SELECT * FROM graves WHERE deceased_name LIKE '%Ahmad%';

-- Get graves with block info
SELECT 
    g.id,
    g.deceased_name,
    g.number,
    b.code,
    g.date_of_death
FROM graves g
JOIN blocks b ON g.block_id = b.id
ORDER BY b.code, g.number;

-- Search by date range (using date_of_death index)
SELECT * FROM graves 
WHERE date_of_death BETWEEN '2020-01-01' AND '2020-12-31';

-- Search by grave number (using number index)
SELECT * FROM graves WHERE number = '12A';
```

---

## 👨‍👩‍👧 Table: `heirs`

Stores heir data (1-3 persons per grave).

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique ID |
| `grave_id` | INTEGER | NOT NULL, FK → graves(id) | Reference to grave |
| `order_number` | INTEGER | NOT NULL, DEFAULT 1 | Heir order (1, 2, 3) |
| `full_name` | TEXT | NOT NULL | Full name of heir |
| `phone_number` | TEXT | - | Phone/WhatsApp number |
| `relationship` | TEXT | - | child, spouse, grandchild, sibling, other |
| `address` | TEXT | - | Full address |
| `is_primary` | BOOLEAN | DEFAULT 0 | 1 = primary heir |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update time |

### Constraints

- **UNIQUE(grave_id, order_number)**: Max 1 heir per order per grave
- **ON DELETE CASCADE**: Delete heirs when grave is deleted

### Example Queries

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
SELECT DISTINCT g.*, b.block_code
FROM graves g
JOIN heirs h ON g.id = h.grave_id
JOIN blocks b ON g.block_id = b.id
WHERE h.full_name LIKE '%Budi%';
```

---

## 💰 Table: `payments`

Stores annual fee payment history.

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique ID |
| `grave_id` | INTEGER | NOT NULL, FK → graves(id) | Reference to grave |
| `year` | INTEGER | NOT NULL | Payment year (2022, 2023, ...) |
| `payment_date` | DATE | NOT NULL | Payment date |
| `amount` | INTEGER | NOT NULL | Payment amount |
| `payment_method` | TEXT | DEFAULT 'cash' | cash, transfer, qris, etc. |
| `payment_proof` | TEXT | - | Path to payment proof file |
| `paid_by` | TEXT | - | Name of payer |
| `notes` | TEXT | - | Payment notes |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update time |

### Constraints

- **UNIQUE(grave_id, year)**: One payment per year per grave

### Example Queries

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

-- Payments in date range (using payment_date index)
SELECT * FROM payments 
WHERE payment_date BETWEEN '2024-01-01' AND '2024-01-31';

-- Overdue payments
SELECT 
    g.deceased_name,
    b.code,
    b.annual_fee * (2026 - 2022 + 1 - COUNT(p.id)) as total_arrears
FROM graves g
JOIN blocks b ON g.block_id = b.id
LEFT JOIN payments p ON g.id = p.grave_id 
    AND p.year BETWEEN 2022 AND 2026
GROUP BY g.id
HAVING total_arrears > 0;
```

---

## ⚙️ Table: `settings`

Stores application configuration (single row table).

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | INTEGER | PK, CHECK (id = 1) | Fixed ID = 1 |
| `foundation_name` | TEXT | NOT NULL, DEFAULT | Foundation/graveyard name |
| `address` | TEXT | - | Full address |
| `phone` | TEXT | - | Phone number |
| `email` | TEXT | - | Foundation email |
| `logo_path` | TEXT | - | Logo file path |
| `active_year` | INTEGER | DEFAULT CURRENT_YEAR | Active application year |
| `last_backup` | TIMESTAMP | - | Last backup time |
| `auto_backup` | INTEGER | DEFAULT 1 | 0=off, 1=on |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update time |

### Default Data

| id | foundation_name | address | phone | active_year |
|----|-----------------|---------|-------|-------------|
| 1 | Yayasan Wakaf Makam Al-Ikhlas | Jl. Raya Cipaku No. 123, Bandung City | (022) 1234567 | 2026 |

### Example Queries

```sql
-- Get settings
SELECT * FROM settings WHERE id = 1;

-- Update active year
UPDATE settings SET active_year = 2027 WHERE id = 1;

-- Update last backup
UPDATE settings SET last_backup = CURRENT_TIMESTAMP WHERE id = 1;
```

---

## 🔍 Indexes

Indexes created for query optimization:

```sql
-- Grave indexes
CREATE INDEX idx_graves_block_id ON graves(block_id);
CREATE INDEX idx_graves_deceased_name ON graves(deceased_name);

-- Grave number index (for faster lookup)
CREATE INDEX idx_graves_number ON graves(number);

-- Date indexes (for date range queries and reports)
CREATE INDEX idx_graves_date_of_death ON graves(date_of_death);
CREATE INDEX idx_graves_burial_date ON graves(burial_date);

-- Composite index for block + grave number searches
CREATE INDEX idx_graves_block_number ON graves(block_id, number);

-- Heir indexes
CREATE INDEX idx_heirs_grave_id ON heirs(grave_id);
CREATE INDEX idx_heirs_full_name ON heirs(full_name);
CREATE INDEX idx_heirs_phone ON heirs(phone_number);

-- Payment indexes
CREATE INDEX idx_payments_grave_id ON payments(grave_id);
CREATE INDEX idx_payments_year ON payments(year);
CREATE INDEX idx_payments_grave_year ON payments(grave_id, year);

-- Payment date index (for date range queries)
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- Composite index for year + payment date (for annual reports)
CREATE INDEX idx_payments_year_date ON payments(year, payment_date);
```

### Index Usage Examples

```sql
-- Uses: idx_graves_date_of_death
SELECT * FROM graves 
WHERE date_of_death BETWEEN '2020-01-01' AND '2020-12-31';

-- Uses: idx_graves_grave_number
SELECT * FROM graves WHERE grave_number = '12A';

-- Uses: idx_graves_block_grave_num
SELECT * FROM graves WHERE block_id = 1 AND grave_number = '12A';

-- Uses: idx_payments_payment_date
SELECT * FROM payments 
WHERE payment_date BETWEEN '2024-01-01' AND '2024-01-31';

-- Uses: idx_payments_year_date
SELECT * FROM payments 
WHERE year = 2024 AND payment_date >= '2024-06-01';
```

---

## 🔄 Triggers

Auto-update timestamp when record is updated:

```sql
-- Trigger for blocks table
CREATE TRIGGER update_blocks_timestamp 
AFTER UPDATE ON blocks
BEGIN
    UPDATE blocks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

(Similar triggers exist for: graves, heirs, payments, settings tables)

---

## 📈 Views (Recommended)

Some complex queries that can be created as VIEW:

### View: `v_payment_status`
```sql
CREATE VIEW v_payment_status AS
SELECT 
    g.id as grave_id,
    g.deceased_name,
    b.block_code,
    b.annual_fee,
    strftime('%Y', 'now') as current_year,
    CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END as is_paid
FROM graves g
JOIN blocks b ON g.block_id = b.id
LEFT JOIN payments p ON g.id = p.grave_id 
    AND p.year = CAST(strftime('%Y', 'now') AS INTEGER);
```

### View: `v_block_summary`
```sql
CREATE VIEW v_block_summary AS
SELECT 
    b.id,
    b.block_code,
    b.total_capacity,
    COUNT(g.id) as occupied,
    (b.total_capacity - COUNT(g.id)) as available,
    b.annual_fee
FROM blocks b
LEFT JOIN graves g ON b.id = g.block_id
GROUP BY b.id;
```

### View: `v_arrears_report`
```sql
CREATE VIEW v_arrears_report AS
SELECT 
    g.id as grave_id,
    g.deceased_name,
    b.block_code,
    b.annual_fee,
    (SELECT active_year FROM settings WHERE id = 1) - 2022 + 1 as total_years,
    COUNT(p.id) as paid_years,
    ((SELECT active_year FROM settings WHERE id = 1) - 2022 + 1 - COUNT(p.id)) * b.annual_fee as arrears_amount
FROM graves g
JOIN blocks b ON g.block_id = b.id
LEFT JOIN payments p ON g.id = p.grave_id 
    AND p.year BETWEEN 2022 AND (SELECT active_year FROM settings WHERE id = 1)
GROUP BY g.id
HAVING paid_years < total_years;
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

1. Close application
2. Replace `astana.db` with backup file
3. Reopen application

---

## 📋 ERD (Entity Relationship Diagram)

```
┌──────────────┐         ┌──────────────┐
│    blocks    │1      * │    graves    │
├──────────────┤◄────────├──────────────┤
│ PK id        │         │ PK id        │
│    block_code│         │ FK block_id  │
│    ...       │         │    deceased_name
└──────────────┘         └──────┬───────┘
                                │
                     ┌──────────┴──────────┐
                     │                     │
              ┌──────▼──────┐       ┌──────▼──────┐
              │    heirs    │       │   payments  │
              ├─────────────┤       ├─────────────┤
              │ PK id       │       │ PK id       │
              │ FK grave_id │       │ FK grave_id │
              │    order_number    │    year     │
              │    full_name│       │    amount   │
              └─────────────┘       └─────────────┘

┌──────────────┐
│   settings   │ (Single Row)
├──────────────┤
│ PK id (=1)   │
│    ...       │
└──────────────┘
```

---

## 📝 Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-20 | Initial schema with 5 tables (English naming) |
| 1.0.1 | 2026-02-20 | Added indexes for dates and grave numbers |

---

## 📊 Performance Tips

### Optimized Queries Using Indexes

```sql
-- ✅ Use index: idx_graves_date_of_death
SELECT * FROM graves 
WHERE date_of_death >= '2020-01-01';

-- ✅ Use index: idx_graves_grave_number
SELECT * FROM graves WHERE grave_number = '12A';

-- ✅ Use composite index: idx_graves_block_grave_num
SELECT * FROM graves 
WHERE block_id = 1 AND grave_number = '12A';

-- ✅ Use index: idx_payments_year_date
SELECT * FROM payments 
WHERE year = 2024 AND payment_date >= '2024-01-01';

-- ✅ Use index: idx_heirs_full_name
SELECT * FROM heirs WHERE full_name LIKE '%Budi%';
```

### Query Patterns to Avoid

```sql
-- ❌ Avoid: Function on indexed column
SELECT * FROM graves WHERE YEAR(date_of_death) = 2020;
-- ✅ Better:
SELECT * FROM graves WHERE date_of_death BETWEEN '2020-01-01' AND '2020-12-31';

-- ❌ Avoid: Leading wildcard on indexed column
SELECT * FROM heirs WHERE full_name LIKE '%Budi%';
-- ✅ Better (if possible):
SELECT * FROM heirs WHERE full_name LIKE 'Budi%';
```
