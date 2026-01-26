
-- Create a function to generate mock flow data
CREATE OR REPLACE FUNCTION generate_mock_flow_data()
RETURNS void AS $$
DECLARE
    asset_record RECORD;
    i INT;
    op_types TEXT[] := ARRAY['requisition', 'borrow', 'return', 'transfer', 'scrap', 'dispose', 'inbound'];
    random_op TEXT;
    random_days INT;
BEGIN
    -- Get some existing assets to attach flows to
    FOR asset_record IN SELECT id, asset_code, name FROM assets LIMIT 20 LOOP
        -- Generate 3-5 flow records for each asset
        FOR i IN 1..(floor(random() * 3 + 3)) LOOP
            random_op := op_types[floor(random() * array_length(op_types, 1) + 1)];
            random_days := floor(random() * 7); -- 0 to 6 days ago (within last week)
            
            INSERT INTO asset_flow_records (
                asset_id,
                operation_type,
                operator,
                operation_time,
                description,
                related_form_no,
                target_employee_name,
                target_department_name,
                target_location
            ) VALUES (
                asset_record.id,
                random_op,
                '系统管理员',
                NOW() - (random_days || ' days')::INTERVAL - (floor(random() * 24) || ' hours')::INTERVAL,
                'Mock data for testing dashboard flow list',
                'ITSH-' || floor(random() * 10000 + 10000),
                CASE WHEN random_op IN ('requisition', 'borrow', 'transfer') THEN '测试员工' || floor(random() * 100) ELSE NULL END,
                CASE WHEN random_op IN ('requisition', 'borrow', 'transfer') THEN '技术部' ELSE NULL END,
                CASE WHEN random_op IN ('requisition', 'borrow', 'transfer') THEN '3F 开放办公区' ELSE '仓库' END
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT generate_mock_flow_data();

-- Clean up function
DROP FUNCTION generate_mock_flow_data();
