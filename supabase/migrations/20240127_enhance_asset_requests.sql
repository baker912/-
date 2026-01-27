
-- Add department_id to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department_id') THEN
        ALTER TABLE users ADD COLUMN department_id UUID REFERENCES departments(id);
    END IF;
END $$;

-- Add columns to asset_requests
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asset_requests' AND column_name = 'product_name') THEN
        ALTER TABLE asset_requests ADD COLUMN product_name VARCHAR;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asset_requests' AND column_name = 'product_model') THEN
        ALTER TABLE asset_requests ADD COLUMN product_model VARCHAR;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asset_requests' AND column_name = 'quantity') THEN
        ALTER TABLE asset_requests ADD COLUMN quantity INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asset_requests' AND column_name = 'requester_id') THEN
        ALTER TABLE asset_requests ADD COLUMN requester_id UUID REFERENCES users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asset_requests' AND column_name = 'submitter_id') THEN
        ALTER TABLE asset_requests ADD COLUMN submitter_id UUID REFERENCES users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asset_requests' AND column_name = 'department_id') THEN
        ALTER TABLE asset_requests ADD COLUMN department_id UUID REFERENCES departments(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asset_requests' AND column_name = 'related_asset_id') THEN
        ALTER TABLE asset_requests ADD COLUMN related_asset_id UUID REFERENCES assets(id);
    END IF;
END $$;
