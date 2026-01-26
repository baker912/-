
ALTER TABLE public.asset_dictionary
ADD COLUMN IF NOT EXISTS cost_center TEXT;
