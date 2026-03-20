import pandas as pd
import sqlite3
from argon2 import PasswordHasher
from argon2.low_level import Type
from datetime import datetime
import re
import json

# Generate Argon2 hash untuk password
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)

password = "kebayoran family"
password_hash = ph.hash(password)

print(f"Generated Argon2 Hash: {password_hash}")

# Baca Excel file
excel_file = "/home/hudya/code/project-web-kuburan/astana/Program Aplikasi Pemakaman-3-Mei-2025.xlsm"
df = pd.read_excel(excel_file, sheet_name="data")

# Remove empty rows
df = df.dropna(subset=["Nomor Blok", "Nama Almarhum"])

print(f"Total records: {len(df)}")
print(f"Sample data:")
print(
    df[["Nomor Blok", "Nama Almarhum", "Tanggal dimakamkan", "Nama ahli Waris-1"]].head(
        10
    )
)


# Extract unique blocks from Nomor Blok (e.g., A1 -> A, B12 -> B)
def extract_block_code(nomor_blok):
    if pd.isna(nomor_blok):
        return None
    match = re.match(r"^([A-Za-z]+)", str(nomor_blok))
    return match.group(1).upper() if match else None


def extract_grave_number(nomor_blok):
    if pd.isna(nomor_blok):
        return None
    # Return the full code as grave number (e.g., A1, A2, etc.)
    return str(nomor_blok).strip()


df["block_code"] = df["Nomor Blok"].apply(extract_block_code)
df["grave_number"] = df["Nomor Blok"].apply(extract_grave_number)

# Get unique blocks
blocks = df["block_code"].dropna().unique()
print(f"\nUnique blocks: {sorted(blocks)}")

# Connect to SQLite (create new database)
db_path = "/home/hudya/code/project-web-kuburan/astana/astana.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print(f"\nCreating database at: {db_path}")

# Create schema from migrations
cursor.executescript("""
-- Table: blocks
CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    total_capacity INTEGER NOT NULL DEFAULT 0,
    annual_fee INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: graves
CREATE TABLE IF NOT EXISTS graves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deceased_name TEXT NOT NULL,
    block_id INTEGER NOT NULL,
    number TEXT NOT NULL,
    date_of_death DATE,
    burial_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE RESTRICT,
    UNIQUE(block_id, number)
);

-- Table: heirs
CREATE TABLE IF NOT EXISTS heirs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grave_id INTEGER NOT NULL,
    order_number INTEGER NOT NULL DEFAULT 1,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    relationship TEXT,
    address TEXT,
    is_primary BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grave_id) REFERENCES graves(id) ON DELETE CASCADE,
    UNIQUE(grave_id, order_number)
);

-- Table: payments
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grave_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    payment_date DATE NOT NULL,
    amount INTEGER NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    payment_proof TEXT,
    paid_by TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grave_id) REFERENCES graves(id) ON DELETE CASCADE,
    UNIQUE(grave_id, year)
);

-- Table: settings
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    foundation_name TEXT NOT NULL DEFAULT 'Wakaf Makam Foundation',
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_path TEXT,
    active_year INTEGER DEFAULT (strftime('%Y', 'now')),
    last_backup TIMESTAMP,
    auto_backup INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    is_password_changed BOOLEAN DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (role IN ('superadmin_0', 'superadmin', 'admin'))
);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    old_data TEXT,
    new_data TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_graves_block_id ON graves(block_id);
CREATE INDEX IF NOT EXISTS idx_graves_deceased_name ON graves(deceased_name);
CREATE INDEX IF NOT EXISTS idx_graves_number ON graves(number);
CREATE INDEX IF NOT EXISTS idx_graves_date_of_death ON graves(date_of_death);
CREATE INDEX IF NOT EXISTS idx_graves_burial_date ON graves(burial_date);
CREATE INDEX IF NOT EXISTS idx_graves_block_number ON graves(block_id, number);
CREATE INDEX IF NOT EXISTS idx_heirs_grave_id ON heirs(grave_id);
CREATE INDEX IF NOT EXISTS idx_heirs_full_name ON heirs(full_name);
CREATE INDEX IF NOT EXISTS idx_heirs_phone ON heirs(phone_number);
CREATE INDEX IF NOT EXISTS idx_payments_grave_id ON payments(grave_id);
CREATE INDEX IF NOT EXISTS idx_payments_year ON payments(year);
CREATE INDEX IF NOT EXISTS idx_payments_grave_year ON payments(grave_id, year);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_year_date ON payments(year, payment_date);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_created_at_desc ON audit_logs(created_at DESC);

-- Triggers for auto-update timestamp
CREATE TRIGGER IF NOT EXISTS update_blocks_timestamp 
AFTER UPDATE ON blocks
BEGIN
    UPDATE blocks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_graves_timestamp 
AFTER UPDATE ON graves
BEGIN
    UPDATE graves SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_heirs_timestamp 
AFTER UPDATE ON heirs
BEGIN
    UPDATE heirs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_payments_timestamp 
AFTER UPDATE ON payments
BEGIN
    UPDATE payments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_settings_timestamp 
AFTER UPDATE ON settings
BEGIN
    UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Constraint: Only one superadmin_0
CREATE TRIGGER IF NOT EXISTS ensure_single_superadmin_0
BEFORE INSERT ON users
WHEN NEW.role = 'superadmin_0'
BEGIN
    SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE role = 'superadmin_0') 
        THEN RAISE(ABORT, 'Only one superadmin_0 is allowed')
    END;
END;

CREATE TRIGGER IF NOT EXISTS ensure_single_superadmin_0_update
BEFORE UPDATE ON users
WHEN NEW.role = 'superadmin_0' AND OLD.role != 'superadmin_0'
BEGIN
    SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE role = 'superadmin_0' AND id != OLD.id) 
        THEN RAISE(ABORT, 'Only one superadmin_0 is allowed')
    END;
END;
""")

print("Schema created successfully!")

# Insert superadmin_0
cursor.execute(
    """
    INSERT INTO users (username, password_hash, role, is_active, is_password_changed, created_by) 
    VALUES (?, ?, 'superadmin_0', 1, 0, NULL)
""",
    ("superadmin", password_hash),
)

print(f"Superadmin_0 created with password: {password}")

# Insert default settings
cursor.execute("""
    INSERT OR IGNORE INTO settings (id, foundation_name, address, phone, active_year) 
    VALUES (1, 'Yayasan Wakaf Makam Al-Ikhlas', 'Jl. Raya Cipaku No. 123, Bandung City', '(022) 1234567', 2026)
""")

print("Settings inserted!")

# Insert blocks
block_data = []
for block_code in sorted(blocks):
    count = len(df[df["block_code"] == block_code])
    block_data.append((block_code, f"Blok {block_code}", count, 0, "active"))

cursor.executemany(
    """
    INSERT INTO blocks (code, description, total_capacity, annual_fee, status) 
    VALUES (?, ?, ?, ?, ?)
""",
    block_data,
)

print(f"Inserted {len(block_data)} blocks")

# Get block ID mapping
block_ids = {}
cursor.execute("SELECT id, code FROM blocks")
for row in cursor.fetchall():
    block_ids[row[1]] = row[0]

print(f"Block IDs: {block_ids}")


# Function to parse dates
def parse_date(date_val):
    if pd.isna(date_val):
        return None
    if isinstance(date_val, datetime):
        return date_val.strftime("%Y-%m-%d")
    if isinstance(date_val, str):
        # Try common date formats
        for fmt in ["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y"]:
            try:
                return datetime.strptime(date_val, fmt).strftime("%Y-%m-%d")
            except:
                continue
    return None


# Insert graves and heirs
graves_count = 0
heirs_count = 0
payments_count = 0
skipped_count = 0

for idx, row in df.iterrows():
    if idx % 500 == 0:
        print(f"Processing row {idx}/{len(df)}...")

    block_code = row["block_code"]
    if not block_code or block_code not in block_ids:
        continue

    block_id = block_ids[block_code]
    grave_number = row["grave_number"]
    deceased_name = (
        str(row["Nama Almarhum"]).strip()
        if pd.notna(row["Nama Almarhum"])
        else "Unknown"
    )
    burial_date = parse_date(row["Tanggal dimakamkan"])

    # Check if grave already exists
    cursor.execute(
        "SELECT id FROM graves WHERE block_id = ? AND number = ?",
        (block_id, grave_number),
    )
    existing = cursor.fetchone()

    if existing:
        # Skip duplicate
        skipped_count += 1
        continue

    # Insert grave
    cursor.execute(
        """
        INSERT INTO graves (deceased_name, block_id, number, burial_date, notes) 
        VALUES (?, ?, ?, ?, ?)
    """,
        (deceased_name, block_id, grave_number, burial_date, None),
    )

    grave_id = cursor.lastrowid
    graves_count += 1

    # Insert heirs
    # Heir 1
    if pd.notna(row["Nama ahli Waris-1"]) and str(row["Nama ahli Waris-1"]).strip():
        heir1_name = str(row["Nama ahli Waris-1"]).strip()
        heir1_phone = (
            str(row["No. Telp Ahli Waris-1"])
            if pd.notna(row["No. Telp Ahli Waris-1"])
            else None
        )
        heir1_address = str(row["Alamat"]) if pd.notna(row["Alamat"]) else None

        cursor.execute(
            """
            INSERT INTO heirs (grave_id, order_number, full_name, phone_number, address, is_primary) 
            VALUES (?, 1, ?, ?, ?, 1)
        """,
            (grave_id, heir1_name, heir1_phone, heir1_address),
        )
        heirs_count += 1

    # Heir 2
    if pd.notna(row["Nama ahli Waris-2"]) and str(row["Nama ahli Waris-2"]).strip():
        heir2_name = str(row["Nama ahli Waris-2"]).strip()
        heir2_phone = (
            str(row["No. Telp Ahli Waris-2"])
            if pd.notna(row["No. Telp Ahli Waris-2"])
            else None
        )

        cursor.execute(
            """
            INSERT INTO heirs (grave_id, order_number, full_name, phone_number, is_primary) 
            VALUES (?, 2, ?, ?, 0)
        """,
            (grave_id, heir2_name, heir2_phone),
        )
        heirs_count += 1

    # Process payments (years 2020-2051)
    payment_years = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]
    payment_date_cols = [
        "Tanggal Bayar",
        "Tanggal Bayar.1",
        "Tanggal Bayar.2",
        "Tanggal Bayar.3",
        "Tanggal Bayar.4",
        "Tanggal Bayar.5",
        "Tanggal Bayar.6",
        "Tanggal Bayar.7",
        "Tanggal Bayar.8",
        "Tanggal Bayar.9",
        "Tanggal Bayar.10",
    ]

    for year, date_col in zip(payment_years, payment_date_cols):
        if year in df.columns and date_col in df.columns:
            amount = row[year]
            pay_date = row[date_col]

            if pd.notna(amount) and pd.notna(pay_date):
                try:
                    amount_int = int(float(amount))
                    pay_date_str = parse_date(pay_date)
                    if pay_date_str:
                        cursor.execute(
                            """
                            INSERT OR REPLACE INTO payments (grave_id, year, payment_date, amount, payment_method) 
                            VALUES (?, ?, ?, ?, 'cash')
                        """,
                            (grave_id, year, pay_date_str, amount_int),
                        )
                        payments_count += 1
                except:
                    pass

# Commit all changes
conn.commit()

print(f"\n✅ Import completed!")
print(f"   - Blocks: {len(block_data)}")
print(f"   - Graves: {graves_count}")
print(f"   - Skipped duplicates: {skipped_count}")
print(f"   - Heirs: {heirs_count}")
print(f"   - Payments: {payments_count}")

# Verify data
cursor.execute("SELECT COUNT(*) FROM graves")
print(f"\nVerification - Total graves in DB: {cursor.fetchone()[0]}")

cursor.execute("SELECT COUNT(*) FROM users")
print(f"Verification - Total users in DB: {cursor.fetchone()[0]}")

cursor.execute('SELECT username, role FROM users WHERE role = "superadmin_0"')
superadmin = cursor.fetchone()
print(f"Verification - Superadmin_0: {superadmin}")

conn.close()
print(f"\n✅ Database created at: {db_path}")
print(f"✅ Password for superadmin_0: {password}")
