
-- Create Asset Dictionary table
CREATE TABLE IF NOT EXISTS public.asset_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name VARCHAR(200) NOT NULL,
  bm_number VARCHAR(50),
  procurement_order VARCHAR(50),
  equipment_name VARCHAR(200) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  unit VARCHAR(20),
  price DECIMAL(12,2),
  supplier VARCHAR(200),
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.asset_dictionary ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.asset_dictionary;
CREATE POLICY "Enable all for authenticated users" ON public.asset_dictionary FOR ALL TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dictionary_project_name ON public.asset_dictionary(project_name);
CREATE INDEX IF NOT EXISTS idx_dictionary_equipment_name ON public.asset_dictionary(equipment_name);
