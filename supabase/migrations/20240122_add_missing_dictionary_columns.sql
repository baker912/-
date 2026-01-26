
-- Add missing columns to asset_dictionary
ALTER TABLE public.asset_dictionary
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS specification VARCHAR(200),
ADD COLUMN IF NOT EXISTS quantity INTEGER,
ADD COLUMN IF NOT EXISTS attachment VARCHAR(255);
