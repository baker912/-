
-- Add category_id to asset_dictionary table
ALTER TABLE public.asset_dictionary
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_asset_dictionary_category ON public.asset_dictionary(category_id);
