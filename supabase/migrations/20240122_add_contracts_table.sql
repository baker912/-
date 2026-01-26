
-- Create Procurement Contracts table
CREATE TABLE IF NOT EXISTS public.procurement_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name VARCHAR(200) NOT NULL,
  bm_number VARCHAR(50) NOT NULL,
  procurement_order VARCHAR(50) NOT NULL,
  attachment VARCHAR(255),
  description TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.procurement_contracts ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.procurement_contracts;
CREATE POLICY "Enable all for authenticated users" ON public.procurement_contracts FOR ALL TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_bm_number ON public.procurement_contracts(bm_number);
CREATE INDEX IF NOT EXISTS idx_contracts_procurement_order ON public.procurement_contracts(procurement_order);

-- Create storage bucket for contract attachments if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contract_attachments', 'contract_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated uploads
-- Drop old policy name if it exists (cleanup from potential failed attempts)
DROP POLICY IF EXISTS "Allow uploads for contract_attachments" ON storage.objects;
CREATE POLICY "Allow uploads for contract_attachments" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contract_attachments');

-- Policy to allow authenticated downloads
DROP POLICY IF EXISTS "Allow downloads for contract_attachments" ON storage.objects;
CREATE POLICY "Allow downloads for contract_attachments" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'contract_attachments');
