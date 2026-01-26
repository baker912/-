
-- Update procurement_contracts table
ALTER TABLE public.procurement_contracts
ADD COLUMN IF NOT EXISTS project_time TEXT,
ADD COLUMN IF NOT EXISTS technical_spec JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS other_attachments JSONB DEFAULT '[]'::jsonb;

-- Create contract_suppliers table
CREATE TABLE IF NOT EXISTS public.contract_suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID REFERENCES public.procurement_contracts(id) ON DELETE CASCADE,
    supplier_name TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    contract_files JSONB DEFAULT '[]'::jsonb,
    order_files JSONB DEFAULT '[]'::jsonb,
    payment_files JSONB DEFAULT '[]'::jsonb,
    acceptance_files JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (if not already enabled globally, but good practice)
ALTER TABLE public.contract_suppliers ENABLE ROW LEVEL SECURITY;

-- Policy for viewing (allow all for now based on existing pattern, or authenticated)
CREATE POLICY "Enable read access for all users" ON public.contract_suppliers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.contract_suppliers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON public.contract_suppliers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for authenticated users" ON public.contract_suppliers FOR DELETE USING (auth.role() = 'authenticated');
