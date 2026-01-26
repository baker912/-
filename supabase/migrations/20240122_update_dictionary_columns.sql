
-- Update asset_dictionary table: remove specification and quantity, add accessory_info
ALTER TABLE public.asset_dictionary
DROP COLUMN IF EXISTS specification,
DROP COLUMN IF EXISTS quantity,
ADD COLUMN IF NOT EXISTS accessory_info TEXT;
