
DO $$
DECLARE
    v_asset_ids UUID[];
    v_asset_id UUID;
    v_users JSONB := '[
        {"name": "张三", "code": "EMP1001", "dept": "技术部"},
        {"name": "李四", "code": "EMP1002", "dept": "人事部"},
        {"name": "王五", "code": "EMP1003", "dept": "财务部"},
        {"name": "赵六", "code": "EMP1004", "dept": "行政部"},
        {"name": "钱七", "code": "EMP1005", "dept": "销售部"}
    ]';
    v_floors TEXT[] := ARRAY['3F', '4F', '5F', '6F', '7F', '8F'];
    v_room_types TEXT[] := ARRAY['开放办公区', '独立办公室', '会议室', '研发实验室', '服务器机房'];
    v_user_idx INT;
    v_user JSONB;
    v_floor TEXT;
    v_room TEXT;
    v_location TEXT;
    i INT;
    v_op_time TIMESTAMP;
    v_form_no TEXT;
BEGIN
    -- 1. Get 100 random assets that are currently 'in_stock' to simulate requisition history
    -- OR we can just pick random assets and insert history records, but we should try to keep asset status consistent if possible.
    -- For history records, we can just insert them even if status doesn't match perfectly right now, 
    -- BUT for better realism, let's update the assets to 'in_use' as if they were requisitioned.
    
    SELECT array_agg(id) INTO v_asset_ids FROM (
        SELECT id FROM assets WHERE status = 'in_stock' LIMIT 100
    ) t;

    IF v_asset_ids IS NOT NULL THEN
        FOREACH v_asset_id IN ARRAY v_asset_ids LOOP
            -- Random User
            v_user_idx := floor(random() * 5);
            v_user := v_users->v_user_idx;
            
            -- Random Location
            v_floor := v_floors[floor(random() * array_length(v_floors, 1) + 1)];
            v_room := v_room_types[floor(random() * array_length(v_room_types, 1) + 1)];
            v_location := v_floor || ' ' || v_room || ' 工位-' || floor(random() * 100)::text;
            
            -- Random Time (past 30 days)
            v_op_time := NOW() - (floor(random() * 30) || ' days')::interval;
            
            -- ITSH Form No
            v_form_no := 'ITSH' || to_char(v_op_time, 'YYYYMMDD') || lpad(floor(random() * 1000)::text, 4, '0');

            -- Insert Flow Record
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
                target_floor,
                target_room_type,
                target_specific_location,
                target_location,
                created_at
            ) VALUES (
                v_asset_id,
                'requisition',
                '系统管理员',
                v_op_time,
                '批量导入历史领用数据',
                v_form_no,
                v_user->>'name',
                v_user->>'code',
                v_user->>'dept',
                v_floor,
                v_room,
                '工位-' || floor(random() * 100)::text,
                v_location,
                v_op_time
            );

            -- Update Asset Status to 'in_use'
            UPDATE assets SET 
                status = 'in_use',
                employee_name = v_user->>'name',
                employee_code = v_user->>'code',
                department_name = v_user->>'dept',
                location = v_location,
                floor = v_floor,
                room_type = v_room,
                specific_location = '工位-' || floor(random() * 100)::text,
                updated_at = v_op_time
            WHERE id = v_asset_id;
            
        END LOOP;
    END IF;
END $$;
