
DO $$
DECLARE
    v_users JSONB := '[
        {"name": "张三", "code": "EMP1001", "dept": "技术部"},
        {"name": "李四", "code": "EMP1002", "dept": "人事部"},
        {"name": "王五", "code": "EMP1003", "dept": "财务部"}
    ]';
    v_asset_id UUID;
    v_user_idx INT;
    v_user JSONB;
    v_req_time TIMESTAMP;
    v_ret_time TIMESTAMP;
    i INT;
    v_asset_ids UUID[];
BEGIN
    -- 1. Select 100 random assets to simulate return cycle
    -- We can pick any assets, but ideally ones that are currently 'in_use' would be returned.
    -- OR we pick 'in_stock' assets, simulate a past requisition, then a return.
    -- Let's pick 100 assets regardless of status and force a history cycle on them.
    
    SELECT array_agg(id) INTO v_asset_ids FROM (
        SELECT id FROM assets ORDER BY random() LIMIT 100
    ) t;

    IF v_asset_ids IS NOT NULL THEN
        FOREACH v_asset_id IN ARRAY v_asset_ids LOOP
            v_user_idx := floor(random() * 3);
            v_user := v_users->v_user_idx;
            
            -- Requisition was 30-60 days ago
            v_req_time := NOW() - (floor(random() * 30) + 30 || ' days')::interval;
            -- Return was 0-30 days ago
            v_ret_time := v_req_time + (floor(random() * 20) + 5 || ' days')::interval;

            -- 1. Insert PAST Requisition Record (to make sure return has context)
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
                v_req_time,
                '历史领用记录（补录）',
                'ITSH-PAST-' || to_char(v_req_time, 'YYYYMMDD') || '-' || floor(random()*1000)::text,
                v_user->>'name',
                v_user->>'code',
                v_user->>'dept',
                '历史办公位'
            );

            -- 2. Insert Return Record
            INSERT INTO asset_flow_records (
                asset_id,
                operation_type,
                operator,
                operation_time,
                description,
                target_employee_name, -- Return record usually records who returned it
                target_employee_code,
                target_department_name
            ) VALUES (
                v_asset_id,
                'return',
                '系统管理员',
                v_ret_time,
                '资产正常归还',
                v_user->>'name',
                v_user->>'code',
                v_user->>'dept'
            );

            -- 3. Update asset status to 'in_stock' (since it was returned)
            -- Note: This might overwrite 'in_use' status from other mocks, which is fine for simulation.
            UPDATE assets SET 
                status = 'in_stock',
                employee_name = NULL,
                employee_code = NULL,
                department_name = NULL,
                location = NULL
            WHERE id = v_asset_id;
            
        END LOOP;
    END IF;
END $$;
