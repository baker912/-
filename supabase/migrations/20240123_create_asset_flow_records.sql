
CREATE TABLE IF NOT EXISTS asset_flow_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL, -- 'requisition', 'return', 'borrow', 'transfer', 'scrap', 'dispose'
    operator VARCHAR(100) NOT NULL,
    operation_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,
    
    -- Snapshot of asset state or relevant info for this operation
    target_employee_name VARCHAR(100),
    target_employee_code VARCHAR(50),
    target_department_name VARCHAR(100),
    target_location VARCHAR(200),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookup by asset
CREATE INDEX IF NOT EXISTS idx_asset_flow_asset_id ON asset_flow_records(asset_id);
