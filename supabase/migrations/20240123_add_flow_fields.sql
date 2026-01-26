
ALTER TABLE asset_flow_records 
ADD COLUMN IF NOT EXISTS related_form_no TEXT, -- ITSH关联单号
ADD COLUMN IF NOT EXISTS target_floor TEXT,
ADD COLUMN IF NOT EXISTS target_room_type TEXT,
ADD COLUMN IF NOT EXISTS target_specific_location TEXT;
