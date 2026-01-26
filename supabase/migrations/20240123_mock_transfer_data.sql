
DO $$
DECLARE
    v_users JSONB := '[
        {"name": "张三", "code": "EMP1001", "dept": "技术部"},
        {"name": "李四", "code": "EMP1002", "dept": "人事部"},
        {"name": "王五", "code": "EMP1003", "dept": "财务部"},
        {"name": "赵六", "code": "EMP1004", "dept": "行政部"},
        {"name": "钱七", "code": "EMP1005", "dept": "销售部"}
    ]';
    v_asset_id UUID;
    v_user_idx INT;
    v_new_user_idx INT;
    v_user JSONB;
    v_new_user JSONB;
    v_req_time TIMESTAMP;
    v_trans_time TIMESTAMP;
    v_asset_rec RECORD;
    v_loc_suffix INT;
BEGIN
    -- Select 100 random assets to simulate transfer
    FOR v_asset_rec IN (SELECT id, name, asset_code FROM assets ORDER BY random() LIMIT 100) LOOP
        -- User A (Original Owner)
        v_user_idx := floor(random() * 5);
        v_user := v_users->v_user_idx;
        
        -- User B (New Owner) - simple logic to ensure difference or just pick random
        v_new_user_idx := floor(random() * 5);
        IF v_new_user_idx = v_user_idx THEN
            v_new_user_idx := (v_new_user_idx + 1) % 5;
        END IF;
        v_new_user := v_users->v_new_user_idx;
        
        -- Timestamps
        v_req_time := NOW() - (floor(random() * 60) + 30 || ' days')::interval; -- 30-90 days ago
        v_trans_time := v_req_time + (floor(random() * 20) + 10 || ' days')::interval; -- 10-30 days after requisition
        v_loc_suffix := floor(random() * 1000);

        -- 1. Insert PAST Requisition Record (User A)
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
            target_location,
            target_floor,
            target_room_type,
            target_specific_location
        ) VALUES (
            v_asset_rec.id,
            'requisition',
            '系统管理员',
            v_req_time,
            '历史领用记录（转移前）',
            'ITSH-PRE-' || to_char(v_req_time, 'YYYYMMDD') || '-' || v_loc_suffix,
            v_user->>'name',
            v_user->>'code',
            v_user->>'dept',
            '原位置-' || v_loc_suffix,
            '3F',
            '开放办公区',
            '工位-' || v_loc_suffix
        );

        -- 2. Insert Transfer Record (User A -> User B)
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
            target_location,
            target_floor,
            target_room_type,
            target_specific_location
        ) VALUES (
            v_asset_rec.id,
            'transfer',
            '系统管理员',
            v_trans_time,
            '资产转移测试数据',
            'ITSH-TRANS-' || to_char(v_trans_time, 'YYYYMMDD') || '-' || v_loc_suffix,
            v_new_user->>'name',
            v_new_user->>'code',
            v_new_user->>'dept',
            '新位置-' || v_loc_suffix,
            '5F',
            '研发实验室',
            '实验室-' || v_loc_suffix
        );

        -- 3. Update asset status to 'in_use' by User B
        UPDATE assets SET 
            status = 'in_use',
            employee_name = v_new_user->>'name',
            employee_code = v_new_user->>'code',
            department_name = v_new_user->>'dept',
            location = '新位置-' || v_loc_suffix,
            floor = '5F',
            room_type = '研发实验室',
            specific_location = '实验室-' || v_loc_suffix
        WHERE id = v_asset_rec.id;
        
    END LOOP;
END $$;
