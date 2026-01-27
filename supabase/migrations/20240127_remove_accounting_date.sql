
-- Remove accounting_date column from assets table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'accounting_date') THEN
        ALTER TABLE assets DROP COLUMN accounting_date;
    END IF;
END $$;
