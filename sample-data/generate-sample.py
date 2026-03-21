#!/usr/bin/env python3
"""
Generate sample data for Astana database
Creates 500 sample graves with heirs and payments
"""

import sqlite3
import random
from datetime import datetime, timedelta
import os

# Sample data
FIRST_NAMES = [
    "Ahmad",
    "Budi",
    "Citra",
    "Dewi",
    "Eko",
    "Fajar",
    "Gita",
    "Hadi",
    "Indah",
    "Joko",
    "Kartini",
    "Lestari",
    "Mulyono",
    "Nur",
    "Oscar",
    "Putri",
    "Qori",
    "Rina",
    "Santoso",
    "Tuti",
    "Umar",
    "Vina",
    "Wahyu",
    "Yanti",
    "Zulkarnain",
    "Abdul",
    "Bambang",
    "Cahyo",
    "Diana",
    "Endang",
    "Fauzi",
    "Guntur",
    "Hendra",
    "Irawan",
    "Jumadi",
    "Kusuma",
    "Lilik",
    "Mardiana",
    "Ningsih",
    "Oktavia",
    "Puspita",
    "Rahayu",
    "Suryadi",
    "Teguh",
    "Utami",
    "Viktor",
    "Wulandari",
    "Yudhistira",
    "Zainal",
    "Adi",
]

LAST_NAMES = [
    "Santoso",
    "Wijaya",
    "Kusuma",
    "Pratama",
    "Sari",
    "Hidayat",
    "Nugroho",
    "Setiawan",
    "Susanti",
    "Saputra",
    "Rahayu",
    "Wulandari",
    "Lestari",
    "Kartika",
    "Suryadi",
    "Handayani",
    "Ramadhan",
    "Indah",
    "Mulyani",
    "Purnama",
    "Siregar",
    "Simanjuntak",
    "Nasution",
    "Harahap",
    "Sinaga",
    "Sitompul",
    "Turnip",
    "Aritonang",
    "Hasibuan",
    "Pardede",
    "Lumban Tobing",
    "Pane",
    "Silalahi",
    "Gultom",
    "Siahaan",
    "Matondang",
    "Saragih",
    "Damanik",
    "Tanjung",
    "Banjarnahor",
    "Marpaung",
    "Sembiring",
    "Tarigan",
    "Ginting",
    "Surbakti",
    "Pinem",
    "Nadeak",
    "Lumbantoruan",
    "Pangaribuan",
    "Manurung",
]

RELATIONSHIPS = ["Anak", "Istri", "Suami", "Cucu", "Saudara", "Lainnya"]
PAYMENT_METHODS = ["cash", "transfer", "qris"]
STREETS = [
    "Jl. Mawar",
    "Jl. Melati",
    "Jl. Anggrek",
    "Jl. Kenanga",
    "Jl. Cempaka",
    "Jl. Dahlia",
    "Jl. Flamboyan",
    "Jl. Bougenville",
]


def generate_name():
    """Generate random Indonesian name"""
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    return f"{first} {last}"


def generate_phone():
    """Generate random phone number"""
    return f"08{random.randint(10, 99)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"


def generate_address():
    """Generate random address"""
    street = random.choice(STREETS)
    number = random.randint(1, 200)
    rt = random.randint(1, 20)
    rw = random.randint(1, 10)
    return f"{street} No. {number}, RT.{rt}/RW.{rw}"


def random_date(start_year=1970, end_year=2024):
    """Generate random date"""
    start_date = datetime(start_year, 1, 1)
    end_date = datetime(end_year, 12, 31)
    time_between = end_date - start_date
    days_between = time_between.days
    random_days = random.randrange(days_between)
    return (start_date + timedelta(days=random_days)).strftime("%Y-%m-%d")


def generate_grave_number(block_id, index):
    """Generate grave number like 001, 002, etc."""
    return f"{index:03d}"


def generate_sample_data(db_path, num_graves=500):
    """Generate sample data and insert into database"""

    # Remove existing database if exists
    if os.path.exists(db_path):
        os.remove(db_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print(f"Creating sample database with {num_graves} graves...")

    # Create tables
    cursor.executescript("""
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
            expected_fee INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (grave_id) REFERENCES graves(id) ON DELETE CASCADE,
            UNIQUE(grave_id, year)
        );

        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            foundation_name TEXT NOT NULL DEFAULT 'Yayasan Wakaf Makam Sample',
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
    """)

    # Insert blocks
    blocks_data = [
        ("A", "Blok A - Area Premium", 100, 100000, "active"),
        ("B", "Blok B - Area Standar", 100, 75000, "active"),
        ("C", "Blok C - Area Standar", 100, 75000, "active"),
        ("D", "Blok D - Area Ekonomis", 100, 50000, "active"),
        ("E", "Blok E - Area Ekonomis", 100, 50000, "active"),
    ]

    cursor.executemany(
        "INSERT INTO blocks (code, description, total_capacity, annual_fee, status) VALUES (?, ?, ?, ?, ?)",
        blocks_data,
    )

    # Insert settings
    cursor.execute(
        """
        INSERT INTO settings (id, foundation_name, address, phone, email, active_year) 
        VALUES (?, ?, ?, ?, ?, ?)
    """,
        (
            1,
            "Yayasan Wakaf Makam Astana Sample",
            "Jl. Contoh No. 123, Kota Sample, Indonesia",
            "0812-3456-7890",
            "info@yayasan-sample.org",
            2026,
        ),
    )

    # Generate graves
    block_capacities = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}  # Track count per block

    for i in range(1, num_graves + 1):
        # Distribute evenly across blocks
        block_id = ((i - 1) % 5) + 1
        block_capacities[block_id] += 1

        deceased_name = generate_name()
        grave_number = generate_grave_number(block_id, block_capacities[block_id])
        date_of_death = random_date(1980, 2024)
        burial_date = random_date(
            int(date_of_death[:4]), min(2024, int(date_of_death[:4]) + 1)
        )

        cursor.execute(
            """
            INSERT INTO graves (deceased_name, block_id, number, date_of_death, burial_date)
            VALUES (?, ?, ?, ?, ?)
        """,
            (deceased_name, block_id, grave_number, date_of_death, burial_date),
        )

        grave_id = cursor.lastrowid

        # Generate 1-3 heirs per grave
        num_heirs = random.randint(1, 3)
        for order in range(1, num_heirs + 1):
            heir_name = generate_name()
            phone = generate_phone()
            relationship = random.choice(RELATIONSHIPS)
            address = generate_address()
            is_primary = 1 if order == 1 else 0

            cursor.execute(
                """
                INSERT INTO heirs (grave_id, order_number, full_name, phone_number, relationship, address, is_primary)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (grave_id, order, heir_name, phone, relationship, address, is_primary),
            )

        # Generate payments for years 2020-2026 (random 70% have paid)
        for year in range(2020, 2027):
            if random.random() < 0.7:  # 70% payment rate
                # Get the annual fee for this block
                annual_fee = blocks_data[block_id - 1][3]

                payment_date = random_date(year, year)
                amount = annual_fee
                method = random.choice(PAYMENT_METHODS)
                paid_by = generate_name()

                cursor.execute(
                    """
                    INSERT INTO payments (grave_id, year, payment_date, amount, expected_fee, payment_method, paid_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                    (grave_id, year, payment_date, amount, annual_fee, method, paid_by),
                )

    conn.commit()

    # Print statistics
    cursor.execute("SELECT COUNT(*) FROM blocks")
    blocks_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM graves")
    graves_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM heirs")
    heirs_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM payments")
    payments_count = cursor.fetchone()[0]

    conn.close()

    print(f"✓ Created {blocks_count} blocks")
    print(f"✓ Created {graves_count} graves")
    print(f"✓ Created {heirs_count} heirs")
    print(f"✓ Created {payments_count} payments")
    print(f"\nSample database created at: {db_path}")


if __name__ == "__main__":
    db_path = "/home/hudya/code/project-web-kuburan/astana/sample-data/astana-sample.db"
    generate_sample_data(db_path, num_graves=500)
