
DO $$
DECLARE
    v_users JSONB := '[
        {"name": "张三", "code": "EMP1001", "dept": "技术部"},
        {"name": "李四", "code": "EMP1002", "dept": "人事部"},
        {"name": "王五", "code": "EMP1003", "dept": "财务部"},
        {"name": "赵六", "code": "EMP1004", "dept": "行政部"},
        {"name": "钱七", "code": "EMP1005", "dept": "销售部"}
    ]';
    v_asset_ids UUID[];
    v_asset_id UUID;
    v_user_idx INT;
    v_user JSONB;
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_op_time TIMESTAMP;
    i INT;
    j INT;
    v_multi_count INT;
    v_desc TEXT;
BEGIN
    -- 1. Create 70 Single Asset Borrow Records
    FOR i IN 1..70 LOOP
        -- Select 1 random available asset
        SELECT id INTO v_asset_id FROM assets WHERE status = 'in_stock' ORDER BY random() LIMIT 1;
        
        IF v_asset_id IS NOT NULL THEN
            v_user_idx := floor(random() * 5);
            v_user := v_users->v_user_idx;
            v_op_time := NOW() - (floor(random() * 60) || ' days')::interval;
            v_start_time := v_op_time + '1 day'::interval;
            v_end_time := v_start_time + (floor(random() * 30) || ' days')::interval;
            
            INSERT INTO asset_flow_records (
                asset_id,
                operation_type,
                operator,
                operation_time,
                description,
                target_employee_name,
                target_employee_code,
                target_department_name,
                target_location,
                borrow_start_time,
                borrow_end_time
            ) VALUES (
                v_asset_id,
                'borrow',
                '系统管理员',
                v_op_time,
                '单资产借用测试数据',
                v_user->>'name',
                v_user->>'code',
                v_user->>'dept',
                '借用位置-' || i,
                v_start_time,
                v_end_time
            );

            UPDATE assets SET status = 'in_use' WHERE id = v_asset_id;
        END IF;
    END LOOP;

    -- 2. Create 10 Batches of Multi-Asset Borrow Records (approx 30+ assets total)
    FOR i IN 1..10 LOOP
        v_user_idx := floor(random() * 5);
        v_user := v_users->v_user_idx;
        v_op_time := NOW() - (floor(random() * 60) || ' days')::interval;
        v_start_time := v_op_time + '1 day'::interval;
        v_end_time := v_start_time + (floor(random() * 30) || ' days')::interval;
        v_desc := '批量借用测试批次-' || i;
        
        -- Use related_form_no to group borrow records too (optional but good for grouping)
        -- Although borrow usually doesn't strictly require ITSH no, we use it for internal grouping logic in UI if needed
        -- Or rely on timestamp/user grouping. But let's add a mock form no for grouping consistency if UI uses it.
        
        -- Select 3-5 random available assets
        SELECT array_agg(id) INTO v_asset_ids FROM (
            SELECT id FROM assets WHERE status = 'in_stock' ORDER BY random() LIMIT (floor(random() * 3) + 3)
        ) t;

        IF v_asset_ids IS NOT NULL THEN
            FOREACH v_asset_id IN ARRAY v_asset_ids LOOP
                INSERT INTO asset_flow_records (
                    asset_id,
                    operation_type,
                    operator,
                    operation_time,
                    description,
                    related_form_no, -- Use this to group multi-borrow in UI logic if we want
                    target_employee_name,
                    target_employee_code,
                    target_department_name,
                    target_location,
                    borrow_start_time,
                    borrow_end_time
                ) VALUES (
                    v_asset_id,
                    'borrow',
                    '系统管理员',
                    v_op_time,
                    v_desc,
                    'BORROW-BATCH-' || i, -- Group key
                    v_user->>'name',
                    v_user->>'code',
                    v_user->>'dept',
                    '批量借用位置-' || i,
                    v_start_time,
                    v_end_time
                );

                UPDATE assets SET status = 'in_use' WHERE id = v_asset_id;
            END LOOP;
        END IF;
    END LOOP;
END $$;
