-- Enable RLS on asset_flow_records table
ALTER TABLE IF EXISTS public.asset_flow_records ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.asset_flow_records;

CREATE POLICY "Enable all for authenticated users" ON public.asset_flow_records
    FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);
