
DO $$
BEGIN
    -- 1. Move all existing records 1 day into the past to ensure they are older
    UPDATE asset_flow_records 
    SET operation_time = operation_time - interval '1 day';

    -- 2. Update the multi-asset mock records to NOW() so they appear first
    UPDATE asset_flow_records 
    SET operation_time = NOW()
    WHERE related_form_no LIKE 'ITSH-MULTI%';
    
END $$;
