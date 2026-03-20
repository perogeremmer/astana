import sqlite3
from argon2 import PasswordHasher
from argon2.low_level import Type

# Generate Argon2 hash untuk password
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)

password = "123456"
password_hash = ph.hash(password)

print(f"Generated Argon2 Hash: {password_hash}")

# Connect to database
db_path = "/home/hudya/code/project-web-kuburan/astana.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Update password for superadmin_0
cursor.execute(
    """
    UPDATE users 
    SET password_hash = ?
    WHERE role = 'superadmin_0'
""",
    (password_hash,),
)

conn.commit()

# Verify update
cursor.execute("SELECT id, username, role FROM users WHERE role = 'superadmin_0'")
user = cursor.fetchone()

if user:
    print(f"✅ Password updated successfully for {user[1]} (ID: {user[0]})")
    print(f"New password: {password}")
else:
    print("❌ No superadmin_0 user found")

conn.close()
