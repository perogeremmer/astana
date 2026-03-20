#!/bin/bash

# Migration script to add expected_fee column and populate existing data
# Run this script to migrate existing database

echo "🕌 Astana Database Migration"
echo "============================"
echo ""

DB_PATH="$HOME/code/project-web-kuburan/astana.db"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found at: $DB_PATH"
    echo "Please check the path and try again."
    exit 1
fi

echo "📁 Database found: $DB_PATH"
echo ""

# Check if column already exists
echo "🔍 Checking if expected_fee column exists..."
COLUMN_EXISTS=$(sqlite3 "$DB_PATH" "PRAGMA table_info(payments);" | grep -c "expected_fee")

if [ "$COLUMN_EXISTS" -gt 0 ]; then
    echo "✅ Column expected_fee already exists!"
    echo ""
    read -p "Do you want to re-populate the data? (y/N): " REPOPULATE
    if [[ ! "$REPOPULATE" =~ ^[Yy]$ ]]; then
        echo "Migration skipped."
        exit 0
    fi
    echo ""
else
    echo "➕ Adding expected_fee column to payments table..."
    sqlite3 "$DB_PATH" <<EOF
ALTER TABLE payments ADD COLUMN expected_fee INTEGER NOT NULL DEFAULT 0;
EOF
    echo "✅ Column added successfully!"
    echo ""
fi

# Populate existing payments with expected_fee from blocks
echo "📝 Populating expected_fee for existing payments..."
echo "   (Using current block's annual_fee as the snapshot value)"
echo ""

sqlite3 "$DB_PATH" <<EOF
UPDATE payments 
SET expected_fee = COALESCE(
    (SELECT b.annual_fee 
     FROM graves g 
     JOIN blocks b ON g.block_id = b.id 
     WHERE g.id = payments.grave_id),
    0
)
WHERE expected_fee = 0 OR expected_fee IS NULL;
EOF

echo "✅ Migration complete!"
echo ""

# Show statistics
echo "📊 Migration Statistics:"
echo "------------------------"
sqlite3 "$DB_PATH" <<EOF
SELECT 
    COUNT(*) as total_payments,
    COUNT(CASE WHEN expected_fee > 0 THEN 1 END) as populated,
    COUNT(CASE WHEN expected_fee = 0 OR expected_fee IS NULL THEN 1 END) as empty
FROM payments;
EOF

echo ""
echo "🎉 Done! Your database has been migrated successfully."