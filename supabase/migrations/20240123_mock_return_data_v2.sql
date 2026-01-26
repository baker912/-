
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
    v_user JSONB;
    v_req_time TIMESTAMP;
    v_ret_time TIMESTAMP;
    v_asset_ids UUID[];
    v_asset_rec RECORD;
BEGIN
    -- Select 100 random assets
    FOR v_asset_rec IN (SELECT id, name, asset_code FROM assets ORDER BY random() LIMIT 100) LOOP
        v_user_idx := floor(random() * 5);
        v_user := v_users->v_user_idx;
        
        -- Requisition was 30-60 days ago
        v_req_time := NOW() - (floor(random() * 30) + 30 || ' days')::interval;
        -- Return was 5-25 days after requisition
        v_ret_time := v_req_time + (floor(random() * 20) + 5 || ' days')::interval;

        -- 1. Insert PAST Requisition Record (Context)
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
            '历史领用记录（补录数据）',
            'ITSH-PAST-' || to_char(v_req_time, 'YYYYMMDD') || '-' || floor(random()*1000)::text,
            v_user->>'name',
            v_user->>'code',
            v_user->>'dept',
            '历史使用位置'
        );

        -- 2. Insert Return Record
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
            '资产归还测试数据',
            v_user->>'name',
            v_user->>'code',
            v_user->>'dept'
        );

        -- 3. Update asset status to 'in_stock'
        UPDATE assets SET 
            status = 'in_stock',
            employee_name = NULL,
            employee_code = NULL,
            department_name = NULL,
            location = NULL
        WHERE id = v_asset_rec.id;
        
    END LOOP;
END $$;
