import pandas as pd
import sqlite3
from argon2 import PasswordHasher
from argon2.low_level import Type

# Generate Argon2 hash untuk password
ph = PasswordHasher(
    time_cost=3,  # t_cost
    memory_cost=65536,  # m_cost (64 MB)
    parallelism=4,  # p_cost
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)

password = "kebayoran family"
password_hash = ph.hash(password)

print(f"Password: {password}")
print(f"Argon2 Hash: {password_hash}")

# Baca Excel file
excel_file = "/home/hudya/code/project-web-kuburan/astana/Program Aplikasi Pemakaman-3-Mei-2025.xlsm"

# Cek sheet names
xl = pd.ExcelFile(excel_file)
print(f"\nSheet names: {xl.sheet_names}")

# Baca setiap sheet untuk lihat struktur
for sheet in xl.sheet_names:
    print(f"\n{'=' * 60}")
    print(f"Sheet: {sheet}")
    print("=" * 60)
    df = pd.read_excel(excel_file, sheet_name=sheet)
    print(f"Shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(f"\nFirst 5 rows:")
    print(df.head())
    print(f"\nLast 5 rows:")
    print(df.tail())
