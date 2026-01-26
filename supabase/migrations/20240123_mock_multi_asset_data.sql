
DO $$
DECLARE
    v_users JSONB := '[
        {"name": "张三", "code": "EMP1001", "dept": "技术部"},
        {"name": "李四", "code": "EMP1002", "dept": "人事部"}
    ]';
    v_user_idx INT;
    v_user JSONB;
    v_asset_ids UUID[];
    v_asset_id UUID;
    v_form_no TEXT;
    v_op_time TIMESTAMP;
    v_desc TEXT;
    j INT;
    k INT;
BEGIN
    -- Create 3 batches of multi-asset requisitions
    FOR j IN 1..3 LOOP
        v_user_idx := floor(random() * 2);
        v_user := v_users->v_user_idx;
        v_op_time := NOW() - (j || ' hours')::interval;
        v_form_no := 'ITSH-MULTI-' || to_char(v_op_time, 'YYYYMMDD') || '-' || j;
        v_desc := '批量领用测试数据 ' || j;

        -- Select 3-5 random available assets
        SELECT array_agg(id) INTO v_asset_ids FROM (
            SELECT id FROM assets WHERE status = 'in_stock' ORDER BY random() LIMIT (floor(random() * 3) + 3)
        ) t;
        
        IF v_asset_ids IS NOT NULL THEN
            FOREACH v_asset_id IN ARRAY v_asset_ids LOOP
                -- Insert flow record
                INSERT INTO asset_flow_records (
                    asset_id,
                    operation_type,
                    operator,
                    operation_time,
                    description,
                    related_form_no,
                    target_employee_name,
                    target_employee_code,
                    target_department_name,
                    target_location
                ) VALUES (
                    v_asset_id,
                    'requisition',
                    '系统管理员',
                    v_op_time,
                    v_desc,
                    v_form_no,
                    v_user->>'name',
                    v_user->>'code',
                    v_user->>'dept',
                    '批量测试位置'
                );

                -- Update asset status
                UPDATE assets SET 
                    status = 'in_use',
                    employee_name = v_user->>'name',
                    employee_code = v_user->>'code',
                    department_name = v_user->>'dept',
                    location = '批量测试位置'
                WHERE id = v_asset_id;
            END LOOP;
        END IF;
    END LOOP;
END $$;
