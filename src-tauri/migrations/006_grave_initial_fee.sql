ALTER TABLE graves ADD COLUMN initial_fee_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE graves ADD COLUMN initial_fee_payment_date DATE;
ALTER TABLE graves ADD COLUMN initial_fee_payment_method TEXT;
ALTER TABLE graves ADD COLUMN initial_fee_payment_proof TEXT;
