
-- Add tax fields to asset_dictionary
ALTER TABLE asset_dictionary 
ADD COLUMN IF NOT EXISTS tax_rate numeric,
ADD COLUMN IF NOT EXISTS tax_inclusive_price numeric;

-- Add tax fields to assets
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS tax_rate numeric,
ADD COLUMN IF NOT EXISTS tax_inclusive_price numeric;
