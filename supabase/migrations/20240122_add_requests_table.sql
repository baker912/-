
-- Create Asset Requests table
CREATE TABLE public.asset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_name VARCHAR(200) NOT NULL,
  request_type VARCHAR(50) NOT NULL, -- e.g., '采购', '维修', '借用'
  attachment VARCHAR(255), -- Link to file/image
  description TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.asset_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for authenticated users" ON public.asset_requests FOR ALL TO authenticated USING (true);

-- Indexes
CREATE INDEX idx_requests_created_by ON public.asset_requests(created_by);
