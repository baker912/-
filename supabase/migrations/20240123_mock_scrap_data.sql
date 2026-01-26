
DO $$
DECLARE
    v_users JSONB := '[
        {"name": "张三", "code": "EMP1001", "dept": "技术部"},
        {"name": "李四", "code": "EMP1002", "dept": "人事部"},
        {"name": "王五", "code": "EMP1003", "dept": "财务部"},
        {"name": "赵六", "code": "EMP1004", "dept": "行政部"},
        {"name": "钱七", "code": "EMP1005", "dept": "销售部"}
    ]';
    v_asset_rec RECORD;
    v_user_idx INT;
    v_user JSONB;
    v_req_time TIMESTAMP;
    v_ret_time TIMESTAMP;
    v_scrap_time TIMESTAMP;
    v_loc_suffix INT;
BEGIN
    -- Select 100 random assets to simulate scrapping
    -- Scenario: Asset was used for a while, then returned, then scrapped.
    -- Or: Asset was in stock, then scrapped.
    -- Let's mix: 70% used -> returned -> scrapped, 30% in_stock -> scrapped.
    
    FOR v_asset_rec IN (SELECT id, name, asset_code FROM assets ORDER BY random() LIMIT 100) LOOP
        v_loc_suffix := floor(random() * 1000);
        v_scrap_time := NOW() - (floor(random() * 10) || ' days')::interval; -- Scrapped recently (0-10 days ago)

        IF random() < 0.7 THEN
            -- Case 1: Used -> Returned -> Scrapped
            v_user_idx := floor(random() * 5);
            v_user := v_users->v_user_idx;
            
            v_req_time := v_scrap_time - (floor(random() * 200) + 100 || ' days')::interval; -- Requisitioned 100-300 days ago
            v_ret_time := v_scrap_time - (floor(random() * 20) + 10 || ' days')::interval; -- Returned 10-30 days before scrapping

            -- 1.1 Insert PAST Requisition Record
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
                v_asset_rec.id,
                'requisition',
                '系统管理员',
                v_req_time,
                '历史领用记录（报废前使用）',
                'ITSH-PAST-' || to_char(v_req_time, 'YYYYMMDD') || '-' || v_loc_suffix,
                v_user->>'name',
                v_user->>'code',
                v_user->>'dept',
                '原位置-' || v_loc_suffix
            );

            -- 1.2 Insert Return Record
            INSERT INTO asset_flow_records (
                asset_id,
                operation_type,
                operator,
                operation_time,
                description,
                target_employee_name,
                target_employee_code,
                target_department_name
            ) VALUES (
                v_asset_rec.id,
                'return',
                '系统管理员',
                v_ret_time,
                '设备老化/故障归还',
                v_user->>'name',
                v_user->>'code',
                v_user->>'dept'
            );
        END IF;

        -- 2. Insert Scrap Record
        INSERT INTO asset_flow_records (
            asset_id,
            operation_type,
            operator,
            operation_time,
            description
        ) VALUES (
            v_asset_rec.id,
            'scrap',
            '系统管理员',
            v_scrap_time,
            '资产已达使用年限，性能不足，申请报废'
        );

        -- 3. Update asset status to 'scrapped'
        UPDATE assets SET 
            status = 'scrapped',
            employee_name = NULL,
            employee_code = NULL,
            department_name = NULL,
            location = NULL,
            floor = NULL,
            room_type = NULL,
            specific_location = NULL
        WHERE id = v_asset_rec.id;
        
    END LOOP;
END $$;
